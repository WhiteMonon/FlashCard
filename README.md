# My FlashTabs - Chrome Extension Học Từ Vựng

My FlashTabs là một Chrome Extension giúp bạn học từ vựng hiệu quả thông qua phương pháp lặp lại ngắt quãng (Spaced Repetition System - SRS). Mỗi khi bạn mở một tab mới, một thẻ từ vựng (flashcard) sẽ hiện ra để bạn ôn tập.

Dự án bao gồm:
1.  **Chrome Extension**: Giao diện người dùng, thay thế màn hình New Tab.
2.  **Backend Server**: Cung cấp Audio TTS (Text-to-Speech) chất lượng cao và lưu trữ dữ liệu.

## ✨ Tính Năng Chính (Core Features)

-   **MNew Tab Override**: Thay thế màn hình Tab mới mặc định bằng Flashcard.
-   **Review Mặc Định**: Màn hình chính là chế độ ôn tập (Review), tự động tổng hợp các từ cần học từ tất cả các bộ thẻ.
-   **Spaced Repetition (SRS)**: Thuật toán thông minh tính toán thời gian ôn tập tối ưu cho từng từ (Easy, Good, Hard).
-   **Phát Âm Chuẩn (TTS)**: Tích hợp Edge TTS để tạo âm thanh phát âm chất lượng cao, tự động lưu cache để không cần tạo lại.
-   **Quản Lý Deck (Bộ Thẻ)**:
    -   Tạo mới, đổi tên, xóa các bộ thẻ (Deck).
    -   Thêm từ vựng vào từng bộ thẻ.
    -   Kích hoạt/Vô hiệu hóa bộ thẻ (Active/Inactive) để tập trung học chủ đề mong muốn.
-   **Đồng Bộ Dữ Liệu**: Extension hoạt động offline-first nhưng có khả năng đồng bộ dữ liệu với Backend server.

## 🛠️ Cài Đặt (Installation Guide)

### Yêu Cầu
-   Docker & Docker Compose (để chạy Backend)
-   Google Chrome hoặc trình duyệt Chromium (Edge, Brave, Cốc Cốc...)

### Bước 1: Khởi Chạy Backend

Backend sử dụng Docker để đơn giản hóa việc cài đặt.

1.  Mở terminal tại thư mục gốc của dự án.
2.  Chạy lệnh sau:

    ```bash
    docker-compose up -d --build
    ```

3.  Đợi cho đến khi các container (`backend_api`, `postgres_db`) chạy thành công.
    -   API sẽ chạy tại: `http://localhost:8000`

### Bước 2: Cài Đặt Extension

1.  Mở trình duyệt Chrome.
2.  Truy cập địa chỉ: `chrome://extensions/`
3.  Bật chế độ **Developer mode** (Chế độ dành cho nhà phát triển) ở góc trên bên phải.
4.  Nhấn vào nút **Load unpacked** (Tải tiện ích đã giải nén).
5.  Chọn thư mục `extension` trong dự án này (ví dụ: `.../FlashCard/extension`).

## 📖 Hướng Dẫn Sử Dụng

1.  **Mở Tab Mới**: Extension sẽ tự động hiển thị màn hình Review.
2.  **Review**:
    -   Nhấn **Space** để lật thẻ xem nghĩa.
    -   Nghe phát âm tự động hoặc nhấn nút loa để nghe lại.
    -   Chọn mức độ nhớ: **Easy (1)**, **Good (2)**, **Hard (3)** bằng chuột hoặc phím tắt số tương ứng.
3.  **Quản Lý (Dashboard)**:
    -   Nhấn vào icon **Danh sách** (góc trên bên phải) để vào trang Quản lý bộ thẻ.
    -   Tại đây bạn có thể tạo Deck mới, thêm từ vựng, bật/tắt Deck.
4.  **Thêm Từ**:
    -   Vào Deck mong muốn -> Nhập từ và nghĩa -> Nhấn Add.
    -   Backend sẽ tự động tải Audio phát âm về cho từ mới.

## 🏗️ Tech Stack

-   **Frontend**: Vanilla HTML, CSS, JavaScript (Không framework, tối ưu tốc độ cho New Tab).
-   **Backend**: Python (FastAPI), Edge TTS.
-   **Database**: PostgreSQL.
-   **Containerization**: Docker.

---
*Dự án cá nhân phục vụ mục đích học tập và tự build công cụ học tiếng Anh.*