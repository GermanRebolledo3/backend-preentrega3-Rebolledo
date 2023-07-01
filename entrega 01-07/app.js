import express from "express";
import handlebars from "express-handlebars";
import __dirname from "./utils.js";
import { productManagerRouter } from "./routes/products.router.js";
import { ProductManagerMongo } from "./dao/services/productManagerMongo.js";
import { MsgModel } from "./dao/models/msgs.model.js";
import { cartsRouter } from "./routes/carts.router.js";
import { viewsRouter } from "./routes/views.router.js";
import { Server } from "socket.io";
import { connectMongo } from "./utils.js";
import { loginRouter } from "./routes/login.router.js";
import cookieParser from "cookie-parser";
import session from "express-session";
import MongoStore from "connect-mongo";

const app = express();
app.use(cookieParser());
app.use(
  session({
    store: MongoStore.create({
      mongoUrl:
        "mongodb+srv://agusvj:7C2af80b2e53asd@cluster0.gjhmyvj.mongodb.net/ecommerce?retryWrites=true&w=majority",
      mongoOptions: { useNewUrlParser: true, useUnifiedTopology: true },
      ttl: 15,
    }),
    secret: "secretCoder",
    resave: true,
    saveUninitialized: true,
  })
);
const port = 8080;

connectMongo();

app.use(express.urlencoded({ extended: true }));

const productManagerMongo = new ProductManagerMongo();

const httpServer = app.listen(port, () => {
  console.log(`Server running on port http://localhost:${port}`);
});

const socketServer = new Server(httpServer);

app.engine("handlebars", handlebars.engine());
app.set("views", __dirname + "/views");
app.set("view engine", "handlebars");
app.use(express.static(__dirname + "/public"));

app.use("/", viewsRouter);

socketServer.on("connection", async (socket) => {
  console.log("Nuevo cliente conectado");
  const products = await productManagerMongo.getProducts();
  socket.emit("products", products);
  const msgs = await MsgModel.find({});
  socketServer.sockets.emit("all_msgs", msgs);

  socket.on("formSubmission", async (data) => {
    await productManagerMongo.addProduct(data);
    const products = await productManagerMongo.getProducts();
    socketServer.sockets.emit("products", products);
  });

  socket.on("msg_front_to_back", async (msg) => {
    const msgCreated = await MsgModel.create(msg);
    const msgs = await MsgModel.find({});
    socketServer.sockets.emit("all_msgs", msgs);
  });
});

app.use("/api/products", productManagerRouter);

app.use("/api/carts", cartsRouter);

app.use("/api/sessions", loginRouter);

app.get("*", (req, res) => {
  res.status(404).send({ status: "error", data: "Page not found" });
});