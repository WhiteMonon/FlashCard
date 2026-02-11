/**
 * FSRS-5 (Free Spaced Repetition Scheduler) Engine
 * 
 * Thuật toán lên lịch ôn tập dựa trên mô hình 3 thành phần bộ nhớ:
 * - Difficulty (D): Độ khó của thẻ (1-10)
 * - Stability (S): Khoảng ổn định (ngày) khi R=90%
 * - Retrievability (R): Xác suất nhớ lại tại thời điểm hiện tại
 * 
 * Tham khảo: https://github.com/open-spaced-repetition/fsrs4anki/wiki/The-Algorithm
 */

// Trạng thái thẻ
const State = {
    New: 0,
    Learning: 1,
    Review: 2,
    Relearning: 3,
};

// Rating khi review
const Rating = {
    Again: 1,
    Hard: 2,
    Good: 3,
    Easy: 4,
};

// FSRS-5 default parameters (19 params)
const DEFAULT_W = [
    0.40255,  // w0: S₀(Again)
    1.18385,  // w1: S₀(Hard)
    3.173,    // w2: S₀(Good)
    15.69105, // w3: S₀(Easy)
    7.1949,   // w4: D₀(1) - initial difficulty khi rating Again
    0.5345,   // w5: D₀ decay rate
    1.4604,   // w6: difficulty delta
    0.0046,   // w7: mean reversion weight
    1.54575,  // w8: S'r base
    0.1192,   // w9: S'r stability decay
    1.01925,  // w10: S'r retrievability factor
    1.9395,   // w11: S'f base
    0.11,     // w12: S'f difficulty factor
    0.29605,  // w13: S'f stability factor
    2.2698,   // w14: S'f retrievability factor
    0.2315,   // w15: hard penalty
    2.9898,   // w16: easy bonus
    0.51655,  // w17: same-day review factor
    0.6621,   // w18: same-day review offset
];

// Hằng số forgetting curve (FSRS-4.5+)
const DECAY = -0.5;
const FACTOR = 19 / 81; // Đảm bảo R(S,S) = 90%

/**
 * Settings mặc định cho FSRS
 */
function getDefaultSettings() {
    return {
        desiredRetention: 0.9,
        learningSteps: [1, 10],       // phút
        relearningSteps: [10],         // phút
    };
}

/**
 * Tạo thẻ mới với trạng thái ban đầu
 */
function createEmptyCard() {
    return {
        stability: 0,
        difficulty: 0,
        state: State.New,
        reps: 0,
        step: 0,
        last_review: 0,
        next_review: Date.now(),
    };
}

// --- Các công thức cốt lõi ---

/**
 * Stability ban đầu sau rating đầu tiên
 * S₀(G) = w[G-1]
 */
function initStability(grade) {
    return DEFAULT_W[grade - 1];
}

/**
 * Difficulty ban đầu sau rating đầu tiên
 * D₀(G) = w₄ - e^(w₅·(G-1)) + 1
 */
function initDifficulty(grade) {
    return clampDifficulty(DEFAULT_W[4] - Math.exp(DEFAULT_W[5] * (grade - 1)) + 1);
}

/**
 * Cập nhật difficulty sau review
 * ΔD(G) = -w₆ · (G - 3)
 * D' = D + ΔD
 * D'' = w₇ · D₀(3) + (1 - w₇) · D'  (mean reversion về D₀(3) trong FSRS-5)
 */
function updateDifficulty(D, grade) {
    const deltaD = -DEFAULT_W[6] * (grade - 3);
    const Dprime = D + deltaD;
    const D0_good = DEFAULT_W[4] - Math.exp(DEFAULT_W[5] * (3 - 1)) + 1;
    const Dfinal = DEFAULT_W[7] * D0_good + (1 - DEFAULT_W[7]) * Dprime;
    return clampDifficulty(Dfinal);
}

/**
 * Giới hạn difficulty trong [1, 10]
 */
function clampDifficulty(D) {
    return Math.min(Math.max(D, 1), 10);
}

/**
 * Tính Retrievability (xác suất nhớ)
 * R(t,S) = (1 + FACTOR · t/S)^DECAY
 * Với t tính bằng ngày, S tính bằng ngày
 */
function retrievability(elapsedDays, stability) {
    if (stability <= 0) return 0;
    return Math.pow(1 + FACTOR * elapsedDays / stability, DECAY);
}

/**
 * Tính next interval (ngày) từ stability và desired retention
 * I(r,S) = (S / FACTOR) · (r^(1/DECAY) - 1)
 */
function nextInterval(stability, requestRetention) {
    const interval = (stability / FACTOR) * (Math.pow(requestRetention, 1 / DECAY) - 1);
    return Math.max(1, Math.round(interval));
}

/**
 * Stability mới sau recall thành công (Hard/Good/Easy)
 * S'r(D,S,R,G) = S · (e^w₈ · (11-D) · S^(-w₉) · (e^(w₁₀·(1-R)) - 1) 
 *                 · hardPenalty · easyBonus + 1)
 */
function stabilityAfterRecall(D, S, R, grade) {
    let hardPenalty = 1;
    let easyBonus = 1;

    if (grade === Rating.Hard) hardPenalty = DEFAULT_W[15];
    if (grade === Rating.Easy) easyBonus = DEFAULT_W[16];

    const sinc = Math.exp(DEFAULT_W[8])
        * (11 - D)
        * Math.pow(S, -DEFAULT_W[9])
        * (Math.exp(DEFAULT_W[10] * (1 - R)) - 1)
        * hardPenalty
        * easyBonus;

    return S * (sinc + 1);
}

/**
 * Stability mới sau khi quên (Again)
 * S'f(D,S,R) = w₁₁ · D^(-w₁₂) · ((S+1)^w₁₃ - 1) · e^(w₁₄·(1-R))
 */
function stabilityAfterForgetting(D, S, R) {
    return DEFAULT_W[11]
        * Math.pow(D, -DEFAULT_W[12])
        * (Math.pow(S + 1, DEFAULT_W[13]) - 1)
        * Math.exp(DEFAULT_W[14] * (1 - R));
}

/**
 * Entry point chính: tính scheduling cho 1 thẻ
 * 
 * @param {Object} card - Thẻ hiện tại (stability, difficulty, state, reps, step, last_review, next_review)
 * @param {number} grade - Rating (1=Again, 2=Hard, 3=Good, 4=Easy)
 * @param {number} now - Timestamp hiện tại (ms)
 * @param {Object} settings - FSRS settings (desiredRetention, learningSteps, relearningSteps)
 * @returns {Object} - Thẻ đã cập nhật
 */
function reviewCard(card, grade, now, settings) {
    const cfg = settings || getDefaultSettings();
    const updated = { ...card };
    const elapsedMs = now - (card.last_review || now);
    const elapsedDays = Math.max(0, elapsedMs / (1000 * 60 * 60 * 24));

    if (card.state === State.New) {
        // === THẺ MỚI: tính S₀ và D₀ từ rating đầu tiên ===
        updated.stability = initStability(grade);
        updated.difficulty = initDifficulty(grade);

        if (grade === Rating.Again) {
            // Quên ngay → vào Learning, bắt đầu từ step 0
            updated.state = State.Learning;
            updated.step = 0;
            updated.next_review = now + cfg.learningSteps[0] * 60 * 1000;
        } else if (grade === Rating.Hard) {
            // Nhớ nhưng khó → Learning, step 0
            updated.state = State.Learning;
            updated.step = 0;
            updated.next_review = now + cfg.learningSteps[0] * 60 * 1000;
        } else if (grade === Rating.Good) {
            if (cfg.learningSteps.length > 1) {
                // Có nhiều step → Learning, step 1
                updated.state = State.Learning;
                updated.step = 1;
                updated.next_review = now + cfg.learningSteps[1] * 60 * 1000;
            } else {
                // Chỉ 1 step → thẳng Review
                updated.state = State.Review;
                updated.step = 0;
                const intervalDays = nextInterval(updated.stability, cfg.desiredRetention);
                updated.next_review = now + intervalDays * 24 * 60 * 60 * 1000;
            }
        } else if (grade === Rating.Easy) {
            // Dễ → skip hết learning, thẳng Review
            updated.state = State.Review;
            updated.step = 0;
            const intervalDays = nextInterval(updated.stability, cfg.desiredRetention);
            updated.next_review = now + intervalDays * 24 * 60 * 60 * 1000;
        }
    } else if (card.state === State.Learning || card.state === State.Relearning) {
        // === THẺ ĐANG LEARNING/RELEARNING ===
        const steps = card.state === State.Learning ? cfg.learningSteps : cfg.relearningSteps;
        const currentStep = card.step || 0;

        // Cập nhật difficulty
        if (card.stability > 0) {
            updated.difficulty = updateDifficulty(card.difficulty, grade);
        }

        if (grade === Rating.Again) {
            // Quên → reset về step 0
            updated.step = 0;
            updated.next_review = now + steps[0] * 60 * 1000;
            // Giữ state Learning/Relearning
        } else if (grade === Rating.Hard) {
            // Khó → giữ nguyên step hiện tại, lặp lại
            updated.step = currentStep;
            const stepMinutes = steps[Math.min(currentStep, steps.length - 1)];
            updated.next_review = now + stepMinutes * 60 * 1000;
        } else if (grade === Rating.Good) {
            // Tốt → tiến sang step tiếp theo
            const nextStep = currentStep + 1;
            if (nextStep >= steps.length) {
                // Hết steps → tốt nghiệp, chuyển Review
                updated.state = State.Review;
                updated.step = 0;
                // Tính stability nếu chưa có (thẻ mới vào learning)
                if (!updated.stability || updated.stability <= 0) {
                    updated.stability = initStability(grade);
                }
                const intervalDays = nextInterval(updated.stability, cfg.desiredRetention);
                updated.next_review = now + intervalDays * 24 * 60 * 60 * 1000;
            } else {
                // Còn steps → tiến lên
                updated.step = nextStep;
                updated.next_review = now + steps[nextStep] * 60 * 1000;
            }
        } else if (grade === Rating.Easy) {
            // Dễ → skip hết steps, thẳng Review
            updated.state = State.Review;
            updated.step = 0;
            if (!updated.stability || updated.stability <= 0) {
                updated.stability = initStability(grade);
            }
            if (!updated.difficulty || updated.difficulty <= 0) {
                updated.difficulty = initDifficulty(grade);
            }
            const intervalDays = nextInterval(updated.stability, cfg.desiredRetention);
            updated.next_review = now + intervalDays * 24 * 60 * 60 * 1000;
        }
    } else {
        // === THẺ REVIEW (state = Review) ===
        const R = retrievability(elapsedDays, card.stability);
        updated.difficulty = updateDifficulty(card.difficulty, grade);

        if (grade === Rating.Again) {
            // Quên → tính stability mới, vào Relearning
            updated.stability = stabilityAfterForgetting(card.difficulty, card.stability, R);
            updated.state = State.Relearning;
            updated.step = 0;
            updated.next_review = now + cfg.relearningSteps[0] * 60 * 1000;
        } else {
            // Nhớ → tính stability tăng, giữ Review
            updated.stability = stabilityAfterRecall(card.difficulty, card.stability, R, grade);
            updated.state = State.Review;
            const intervalDays = nextInterval(updated.stability, cfg.desiredRetention);
            updated.next_review = now + intervalDays * 24 * 60 * 60 * 1000;
        }
    }

    updated.last_review = now;
    updated.reps = (card.reps || 0) + 1;

    return updated;
}

/**
 * Tính preview interval cho mỗi rating (hiển thị trên nút)
 * 
 * @param {Object} card - Thẻ hiện tại
 * @param {number} now - Timestamp hiện tại (ms)
 * @param {Object} settings - FSRS settings
 * @returns {Object} - { 1: "1m", 2: "10m", 3: "1d", 4: "4d" }
 */
function previewIntervals(card, now, settings) {
    const result = {};
    for (let grade = 1; grade <= 4; grade++) {
        const preview = reviewCard(card, grade, now, settings);
        const diffMs = preview.next_review - now;
        result[grade] = formatInterval(diffMs);
    }
    return result;
}

/**
 * Format interval (ms) thành chuỗi đọc được
 */
function formatInterval(ms) {
    const minutes = ms / (1000 * 60);
    if (minutes < 60) return `${Math.round(minutes)}m`;
    const hours = minutes / 60;
    if (hours < 24) return `${Math.round(hours)}h`;
    const days = hours / 24;
    if (days < 30) return `${Math.round(days)}d`;
    const months = days / 30;
    return `${Math.round(months)}mo`;
}
