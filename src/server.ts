import app from "./app.js";
import historyLLM from "./llm/history-llm.js";

const port = Number(process.env.PORT || 3000);

app.listen(port, () => {
  console.log(`Server running on ${port}`);

  void historyLLM.warmUp();
});