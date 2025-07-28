// backend/index.js
import express from "express";
import dotenv from "dotenv";
import fetch from "node-fetch";
import axios from "axios";

dotenv.config();

const app = express();
app.use(express.json());

const BSPAY_TOKEN = process.env.BSPAY_TOKEN;
const SHOPIFY_TOKEN = process.env.SHOPIFY_TOKEN;
const SHOPIFY_STORE = process.env.SHOPIFY_STORE;
const SHOPIFY_API_VERSION = "2024-01";

// Criar pagamento Pix
app.post("/pix/create", async (req, res) => {
  const { amount, order_id } = req.body;

  try {
    const response = await axios.post(
      "https://api.bspay.co/v2/pix/payment",
      {
        amount,
        currency: "BRL",
        order_id,
        postback_url: "https://seu-backend.com/webhook",
      },
      {
        headers: {
          Authorization: `Bearer ${BSPAY_TOKEN}`,
        },
      }
    );

    const { qr_code_image, qr_code_text } = response.data;

    res.json({
      qr_code_image,
      qr_code_text,
    });
  } catch (error) {
    console.error("Erro ao criar pagamento Pix:", error);
    res.status(500).send("Erro ao criar Pix");
  }
});

// Webhook BSPAY
app.post("/webhook", async (req, res) => {
  const { status, order_id } = req.body;

  if (status === "paid") {
    try {
      const response = await fetch(
        `https://${SHOPIFY_STORE}/admin/api/${SHOPIFY_API_VERSION}/orders/${order_id}/transactions.json`,
        {
          method: "POST",
          headers: {
            "X-Shopify-Access-Token": SHOPIFY_TOKEN,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            transaction: {
              kind: "sale",
              status: "success",
              amount: "valor_que_veio_da_bspay",
            },
          }),
        }
      );

      const data = await response.json();
      console.log("Pedido atualizado na Shopify:", data);
      res.sendStatus(200);
    } catch (error) {
      console.error("Erro ao atualizar pedido Shopify:", error);
      res.status(500).send("Erro ao atualizar pedido");
    }
  } else {
    res.sendStatus(200);
  }
});

app.listen(3000, () => {
  console.log("Servidor rodando na porta 3000");
});
