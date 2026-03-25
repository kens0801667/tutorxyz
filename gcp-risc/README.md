# Google RISC (跨帳戶防護) 接收器與註冊工具

此目錄包含 `tutorxyz` 專案用於符合 Google OAuth 驗證要求的 **跨帳戶防護 (Cross-Account Protection, RISC)** 實作。

## 專案架構
1.  **接收器 (index.js)**：部署於 Google Cloud Run 的 Node.js 服務，負責接收 Google 發送的安全事件 JWT，並進行加密驗證 (JWKS)。
2.  **註冊工具 (register.js)**：用於透過 Google RISC API 進行系統設定與驗證測試的腳本。

---

## 快速開始

### 1. 部署接收器 (Cloud Run)
1.  進入 `gcp-risc` 目錄。
2.  將程式碼部署至 Cloud Run (可使用 GCP Console 手動上傳或使用 `gcloud run deploy`)。
3.  **重要**：部署後請記下服務的 **URL** (例如 `https://risc-receiver-xxx.run.app`)。

### 2. 準備服務帳戶 (IAM)
1.  在 [GCP Console](https://console.cloud.google.com/iam-admin/serviceaccounts) 建立一個服務帳戶 (例如 `risc-manager`)。
2.  賦予該帳戶以下角色：
    *   **編輯者 (Editor)**
    *   **Service Usage Consumer (服務用量取用者)**
3.  建立並下載 **JSON 金鑰金鑰**，儲存為 `key.json`。

### 3. 向 Google 註冊 (Register)
在 Cloud Shell 中執行：
```bash
# 設定金鑰路徑與接收端 URL
export GOOGLE_APPLICATION_CREDENTIALS="key.json"
export ENDPOINT_URL="您的 Cloud Run URL"

# 安裝與執行註冊
npm install
node register.js register
```
成功後會看到 `Successfully registered! 200`。

### 4. 驗證測試 (Verify)
執行以下指令觸發 Google 發送測試信號：
```bash
node register.js verify
```
成功後，請至 **Cloud Run 記錄 (Logs)** 查看是否收到 `Verified RISC Event`。

---

## 技術細節
*   **JWT 驗證**：使用 `jose` 套件動態抓取 Google 公鑰 (`https://www.googleapis.com/oauth2/v3/certs`)，確保請求來源 100% 真實。
*   **訂閱事件**：本系統預設訂閱了 `sessions-revoked`、`tokens-revoked`、`account-disabled` 與 `verification` 事件。
*   **安全性**：註冊過程要求 `risc.configuration.readwrite` 與 `risc.verify` 權限範圍，確保只有開發者本人能管理設定。

---

## 注意事項
*   請確保 **Google RISC API** 已在專案中[啟用](https://console.cloud.google.com/apis/library/risc.googleapis.com)。
*   `key.json` 包含敏感權限，**請勿提交至公開的 Git 倉庫**。
