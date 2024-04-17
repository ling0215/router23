import express from "express";

const productsAPI = express.Router();

productsAPI.get("/", (req, res) => {
  res.send("獲取所有產品");
});

productsAPI.get("/:id", (req, res) => {
  res.send(`獲取特定 ID 的產品 ${req.params.id}`);
});

productsAPI.post("/", (req, res) => {
  res.send("新增一個產品");
});

productsAPI.put("/:id", (req, res) => {
  res.send(`更新特定 ID 的產品 ${req.params.id}`);
});

productsAPI.delete("/:id", (req, res) => {
  res.send(`刪除特定 ID 的產品 ${req.params.id}`);
});

productsAPI.get("/search", (req, res) => {
 res.send("使用 id 做為搜尋條件搜尋產品");
});

productsAPI.get("/status", (req, res) => {
 res.send("檢查產品狀態");
});

productsAPI.post("/upload", (req, res) => {
  res.send("上傳產品圖片");
});

export default productsAPI;
