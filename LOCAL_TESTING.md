# 本地測試指南 (Local Testing Guide)

本文件說明如何在本地環境中運行與測試 TutorXYZ 應用程式。

## 1. 前端應用程式 (React App)

### 準備工作
- 確認已安裝 `Node.js` (建議 v18 以上)。
- 首次運行請執行 `npm install`。

### 啟動開發伺服器
```bash
npm run dev
```
- 啟動後可訪問 `http://localhost:3000`。
- **Google 登入**: 本專案已預設 Client ID。若您在本地 `localhost` 運作，請確保該 Client ID 已將 `http://localhost:3000` 加入 OAuth 的「已授權的重新導向 URI」。

### 多國語言測試
1. 進入登錄畫面 (`http://localhost:3000`)。
2. 使用右下角的語言切換開關，切換「繁體中文」或「한국어」。
3. 登入後，觀察以下部分的語言是否正確變更：
    - UI 標籤、按鈕、提示訊息。
    - AI 產生的單字解釋 (Gemini API)。
    - AI Teacher 的口語對答與建議。
    - Google 캘린더 (Calendar) 記錄內容。

---

## 2. RISC 接收器 (GCP RISC Receiver)

此服務用於接收 Google 發送的安全事件。

### 啟動本地接收器
```bash
cd gcp-risc
npm install
PORT=8080 npm start
```
- 本地伺服器將會監聽 `http://localhost:8080`。

### 觸發測試事件 (串流驗證)
由於 Google 需將事件發送到公開的 URL，本地測試通常需要透過 `ngrok` 或類似的工具將 8080 端口暴露到外網，或者直接在 Cloud Run 進行最後測試。

**使用腳本進行連通性測試**:
```bash
# 在 gcp-risc 目錄下執行
node register.js verify
```
- 這會通知 Google 向已註冊的 `ENDPOINT_URL` 發送一個驗證 Token。請在 Cloud Run 紀錄中確認是否有收到 202 成功回應。

---

## 3. 常見問題
- **Gemini API 金鑰**: 請在登入後的「系統設定」中輸入您的 Gemini API Key。設定會儲存在您的 Google Drive App Data Folder 中。
- **日曆/雲端硬碟權限**: 首次使用需授權 Google Calendar 與 Drive 存取。
