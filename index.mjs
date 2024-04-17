import express from "express";
import multer from "multer";
import moment from "moment";
import cors from "cors";
import { v4 as uuidv4 } from "uuid";
import jwt from "jsonwebtoken";
import { Low } from "lowdb";
import { JSONFile } from "lowdb/node";
import dotenv from "dotenv";
import productAPI  from "./productAPI.mjs";


dotenv.config();
const secretKey = process.env.SECRET_KEY;

let blackListedToken = [];
let whitelist = ["http://localhost:5500", "http://localhost:3000"];
let corsOptions = {
  credentials: true,
  origin(origin, callback) {
    if (!origin || whitelist.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("不允許傳遞資料 CORS"));
    }
  },
};
const upload = multer();

const defaultData = { products: [], user: [] };
const db = new Low(new JSONFile("db.json"), defaultData);
await db.read();

const app = express();
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/api/products", productAPI);


app.get("/", (req, res) => {
  res.send("首頁");
});

app.get("/api/users", async (req, res) => {
  // res.send("獲取所有使用者");
  // getUserAll
  let users, error;
  users = await getUserAll().then(result => result).catch(err => {
    error = err;
    console.log(err);
    return undefined;
  });
  if(error){
    res.status(401)
      .json({ status: "error", message: "Unauthorized access" });
    return false;
  }
  if(users){
    res.status(200).json({
      status: "success",
      users
    })
  }
});

app.get("/api/users/search", (req, res) => {
  res.send("使用 ID 作為搜尋條件來搜尋使用者");
});

app.get("/api/users/status", checkToken, async (req, res) => {
  // res.send("檢查使用者登入登出狀態");
  let user, error;
  const {account} = req.decoded;
  user = await getUserByAccount(account).then(result => result).catch(err => {
    error = err;
    console.log(err);
    return undefined;
  });

  if(error){
    let message = (error.message)?error.message:"Bad Request";
    res.status(400)
      .json({ status: "error", message });
    return false;
  }
  if(user){
    blackListedToken.push(req.token)
    let token = jwt.sign({
      account: user.account,
      name: user.name,
      head: user.head
    }, secretKey, {expiresIn: "30m"});
    res.status(200).json({
      status: "success",
      message: "已登入",
      token
    })
  }
});

app.get("/api/users/:id/", async (req, res) => {
  // res.send(`獲取特定 ID 的使用者 ${req.params.id}`);
  // getUser
  let user, error;
  user = await getUser(req).then(result => result).catch(err => {
    error = err;
    console.log(err);
    return undefined;
  });
  if(error){
    let message = (error.message)?error.message:"user not found";
    res.status(404)
      .json({ status: "error", message });
    return false;
  }
  if(user){
    let {password, ...newUser} = user;
    res.status(200).json({
      status: "success",
      user: newUser
    })
  }
});

app.post("/api/users/", upload.none(), async (req, res) => {
  // res.send("新增一個使用者");
  let user, error;
  user = await addUser(req).then(result => result).catch(err => {
    error = err;
    console.log(err);
    return undefined;
  });
  if(error){
    let message = (error.message)?error.message:"Invalid input data";
    res.status(409)
      .json({ status: "error", message });
    return false;
  }
  if(user){
    res.status(200).json({
      status: "success",
      message: "User created successfully"
    })
  }
});

app.put("/api/users/:id/", checkToken, upload.none(), async (req, res) => {
  // res.send(`更新特定 ID 的使用者 ${req.params.id}`);
  let user, error;
  user = await userModify(req).then(result => result).catch(err => {
    error = err;
    console.log(err);
    return undefined;
  });
  if(error){
    let message = (error.message)?error.message:"User not found";
    res.status(404)
      .json({ status: "error", message });
    return false;
  }
  if(user){
    blackListedToken.push(req.token);
    let token = jwt.sign({
      account: user.account,
      name: user.name,
      head: user.head
    }, secretKey, {expiresIn: "30m"});
    res.status(200).json({
      status: "success",
      message: "更新成功",
      token
    })
  }
});

app.delete("/api/users/:id/", checkToken, async (req, res) => {
  // res.send(`刪除特定 ID 的使用者 ${req.params.id}`);
  let user, error;
  user = await userDelete(req).then(result => result).catch(err => {
    error = err;
    console.log(err);
    return undefined;
  });
  if(error){
    let message = (error.message)?error.message:"User not found";
    res.status(404)
      .json({ status: "error", message });
    return false;
  }
  if(user){
    blackListedToken.push(req.token);
    let token = jwt.sign({
      account: undefined,
      name: undefined,
      head: undefined
    }, secretKey, {expiresIn: "-10s"});
    res.status(200).json({
      status: "success",
      message: "刪除使用者成功",
      token
    })
  }
});

app.post("/api/users/login", upload.none(), async (req, res) => {
  // res.send("使用者登入");
  let user, error;
  user = await userLogin(req).then(result => result).catch(err => {
    error = err;
    console.log(err);
    return undefined;
  });
  if(error){
    let message = (error.message)?error.message:"Invalid username or password";
    res.status(400)
      .json({ status: "error", message });
    return false;
  }
  if(user){
    let token = jwt.sign({
      account: user.account,
      name: user.name,
      head: user.head
    }, secretKey, {expiresIn: "30m"});
    res.status(200).json({
      status: "success",
      message: "Login successful",
      token
    })
  }
});

app.post("/api/users/logout", checkToken, (req, res) => {
  // res.send("使用者登出");
  blackListedToken.push(req.token);
  let token = jwt.sign({
    account: undefined,
    name: undefined,
    head: undefined
  }, secretKey, {expiresIn: "-10s"});
  res.status(200).json({
    status: "success",
    message: "登出成功",
    token
  })
});




app.listen(3000, () => {
  console.log("server is running at http://localhost:3000");
});

function userDelete(req){
  return new Promise(async (resolve, reject) => {
    const id = req.params.id;
    let user = db.data.user.find(u => u.id === id);
    if(user){
      db.data.user = db.data.user.filter(u => u.id !== id)
      await db.write();
      resolve(true)
    }else{
      reject(new Error("找不到使用者"))
    }
  })
}

function userModify(req){
  return new Promise(async (resolve, reject) => {
    const id = req.params.id;
    const {password, name, head} = req.body;
    let user = db.data.user.find(u => u.id === id);
    if(user){
      Object.assign(user, {password, name, head})
      await db.write();
      resolve(user)
    }else{
      reject(new Error("找不到使用者"))
    }
  })
}

function userLogin(req){
  return new Promise((resolve, reject) => {
    const {account, password} = req.body;
    let result = db.data.user.find(u => u.account === account && u.password === password);
    if(result){
      resolve(result);
    }else{
      reject(new Error("找不到使用者"));
    }
  });
}

function addUser(req){
  const {account, password, name, mail, head} = req.body;

  return new Promise(async (resolve, reject) => {
    let result = db.data.user.find(u => u.account === account);
    if(result){
      reject(new Error("帳號已存在"));
      return false;
    }
    result = db.data.user.find(u => u.mail === mail);
    if(result){
      reject(new Error("email已經被註冊過"));
      return false;
    }
    let id = uuidv4();
    db.data.user.push({id, account, password, name, mail, head});
    await db.write();
    resolve({id})
  });
}

function getUserByAccount(account){
  return new Promise((resolve, reject) => {
    let result = db.data.user.find(u => u.account === account);
    if(result){
      resolve(result);
    }else{
      reject(new Error("找不到使用者"));
    }
  });
}

function getUser(req){
  let id = req.params.id;
  return new Promise((resolve, reject) => {
    let result = db.data.user.find(u => u.id === id);
    if(result){
      resolve(result);
    }else{
      reject(new Error("找不到使用者"));
    }
  });
}

function getUserAll(){
  return new Promise(resolve => {
    resolve(db.data.user)
  });
}

function checkToken(req, res, next) {
  let token = req.get("Authorization");

  if (token && token.indexOf("Bearer ") === 0) {
    token = token.slice(7);
    if(blackListedToken.includes(token)){
      return res.status(401)
        .json({ status: "error", message: "token已經過期" });
    }
    jwt.verify(token, secretKey, (err, decoded) => {
      if (err) {
        return res
          .status(401)
          .json({ status: "error", message: "登入驗證失效，請重新登入。" });
      } else {
        req.decoded = decoded;
        req.token = token;
        next();
      }
    });
  } else {
    return res
      .status(401)
      .json({ status: "error", message: "無登入驗證資料，請重新登入。" });
  }
}
