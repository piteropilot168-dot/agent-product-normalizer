import app from "./src/app.mjs";
const port = Number(process.env.PORT || 3000);
app.listen(port, () => console.log(`Agent Product Normalizer v0.4 listening on ${port}`));
