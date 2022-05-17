import express from "express";
import fetch from "node-fetch";

// lm_4673266fee copied interfaces
interface GPTPropFillRequest {
  // a type definition
  // ex: `type Props = { foo: string; bar: number; };`
  type: string;
}
interface GPTPropFillResponse {
  // a component expression
  // ex: `<Component foo="bar" bar={123} />`
  component: string;
}

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const port = 56900;
const app = express();
app.use(express.json());

app.post("/complete-props", async (req, res) => {
  try {
    const body: GPTPropFillRequest = req.body;
    if (typeof (body || {}).type !== "string")
      return res.status(400).send("type must be a string");
    else if (body.type.length > 256)
      return res.status(400).send("type must be less than 256 characters");
    // todo validate type further

    const id = Math.random().toString(36).substring(2, 15);
    console.log(id, "completion request", body.type);

    const completions = await fetch(
      "https://api.openai.com/v1/engines/code-davinci-002/completions",
      {
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          // lm_17bf0c76a3 type name is expected to be "Props"
          prompt:
            `${body.type}
function Component(props: Props) {}
const r = <Component 
        `.trim() + " ",
          suffix: " />",
          max_tokens: 256,
          temperature: 0,
          top_p: 1,
          frequency_penalty: 0,
          presence_penalty: 0,
          best_of: 4,
        }),
        method: "POST",
      }
    );
    const completionsBody = await completions.json();
    console.log(id, "completion result", completionsBody);

    const { choices } = completionsBody as {
      choices: { finish_reason: string; text: string }[];
    };
    if (choices.length === 0)
      return res.status(400).send("no completion found");

    const { text } =
      choices.find((c) => c.finish_reason === "stop") || choices[0]!;

    const result: GPTPropFillResponse = {
      component: `<Component ${text} />`,
    };
    return res.send(result);
  } catch (e) {
    console.error(e);
    return res.status(500).send("internal server error");
  }
});

app.listen(port, () => {
  console.log(`server started at http://localhost:${port}`);
});
