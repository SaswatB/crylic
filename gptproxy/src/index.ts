import crypto from "crypto";
import express from "express";
import rateLimit from "express-rate-limit";
import LRU from "lru-cache";
import { Configuration, OpenAIApi } from "openai";

// lm_4673266fee copied interfaces
interface GPTPropFillRequest {
  // user identifier, mandated by OpenAI for their abuse tracking
  userId: string;
  // a type definition
  // ex: `type Props = { foo: string; bar: number; };`
  type: string;
}
interface GPTPropFillResponse {
  // a component expression
  // ex: `<Component foo="bar" bar={123} />`
  component: string;
}

const openai = new OpenAIApi(
  new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
  })
);

const cache = new LRU<string, string>({
  maxSize: 50 * 1024 * 1024, // 50 MB
  sizeCalculation: (value, key) => key.length + value.length,
});

const port = 56900;
const app = express();
app.use(express.json());

// rate limit required by OpenAI
app.use(
  rateLimit({
    windowMs: 60 * 1000,
    max: 60, // limit each IP to 60 requests per minute
    message: "Rate limit exceeded.",
  })
);

const wrapGPTPropFillResponse = (props: string): GPTPropFillResponse => ({
  component: `<Component ${props} />`,
});

app.post("/complete-props", async (req, res) => {
  try {
    // parse props
    const body: GPTPropFillRequest = req.body;
    const reqProps = ["userId", "type"] as const;
    if (reqProps.find((p) => typeof (body || {})[p] !== "string")) {
      return res.status(400).send("userId/type must be a string");
    } else if (reqProps.find((p) => body[p].trim().length === 0)) {
      return res.status(400).send("userId/type must be not be empty");
    } else if (body.type.length > 256)
      return res.status(400).send("type must be less than 256 characters");
    // todo validate type further

    const id = Math.random().toString(36).substring(2, 15);
    console.log(id, "completion request", body.type);

    // check cache
    const cacheKey = crypto.createHash("md5").update(body.type).digest("hex");
    const cacheResult = cache.get(cacheKey);
    if (cacheResult !== undefined) {
      console.log(id, "cache hit", cacheResult);
      return res.send(wrapGPTPropFillResponse(cacheResult));
    }

    // request completion
    const completions = await openai.createCompletion("code-davinci-002", {
      user: body.userId,
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
    });
    console.log(id, "completion result", completions.data);

    // get the best choice
    const { choices } = completions.data;
    if (!choices?.length) return res.status(400).send("no completion found");
    const { text } =
      choices.find((c) => c.finish_reason === "stop") || choices[0]!;
    if (!text?.length) return res.status(400).send("no completion found");

    // required content filter check https://beta.openai.com/docs/engines/content-filter
    const contentFilterCheck = await openai.createCompletion(
      "content-filter-alpha",
      {
        user: body.userId,
        prompt: `<|endoftext|>${text}\n--\nLabel:`,
        temperature: 0,
        max_tokens: 1,
        top_p: 0,
        logprobs: 10,
      }
    );
    console.log(id, "content check result", contentFilterCheck.data);

    const toxicThreshold = -0.355;
    const { text: contentFilterResult, logprobs: contentFilterConfidence } =
      contentFilterCheck.data.choices?.[0] || {};
    if (contentFilterResult !== "0" && contentFilterResult !== "1") {
      const confidenceMap = contentFilterConfidence?.top_logprobs?.[0];
      const confidence = (
        confidenceMap as Record<string, number> | undefined
      )?.["2"];
      if (typeof confidence !== "number" || confidence >= toxicThreshold)
        return res.status(400).send("content filter check failed");
    }

    // return the result
    cache.set(cacheKey, text);
    return res.send(wrapGPTPropFillResponse(text));
  } catch (e) {
    console.error(e);
    return res.status(500).send("internal server error");
  }
});

app.listen(port, () => {
  console.log(`server started at http://localhost:${port}`);
});
