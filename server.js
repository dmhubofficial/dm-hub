const express = require("express");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const generatedDir = path.join(__dirname, "public", "generated");
fs.mkdirSync(generatedDir, { recursive: true });

let aiClient = null;

async function getAI() {
  if (!aiClient) {
    const { GoogleGenAI } = await import("@google/genai");
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY
    });
  }
  return aiClient;
}

const videoJobs = new Map();

/* START VIDEO GENERATION */
app.post("/api/video/start", async (req, res) => {
  try {
    const prompt = String(req.body?.prompt || "").trim();

    if (!prompt) {
      return res.status(400).json({
        error: "Please enter a video prompt."
      });
    }

    const ai = await getAI();

    const operation = await ai.models.generateVideos({
      model: "veo-3.1-generate-preview",
      prompt: prompt,
      config: {
        aspectRatio: "9:16",
        resolution: "720p"
      }
    });

    const jobId = crypto.randomUUID();

    videoJobs.set(jobId, {
      operation: operation,
      status: "processing",
      videoUrl: null
    });

    res.json({
      success: true,
      jobId: jobId,
      message: "Video generation started."
    });

  } catch (error) {
    console.error("VIDEO START ERROR:", error);

    res.status(500).json({
      error: error.message || "Video generation failed."
    });
  }
});


/* CHECK VIDEO STATUS */
app.get("/api/video/status/:jobId", async (req, res) => {
  try {
    const job = videoJobs.get(req.params.jobId);

    if (!job) {
      return res.status(404).json({
        error: "Video job not found."
      });
    }

    if (job.status === "done") {
      return res.json({
        status: "done",
        url: job.videoUrl
      });
    }

    const ai = await getAI();

    job.operation = await ai.operations.getVideosOperation({
      operation: job.operation
    });

    if (!job.operation.done) {
      return res.json({
        status: "processing"
      });
    }

    const generatedVideo =
      job.operation.response?.generatedVideos?.[0]?.video;

    if (!generatedVideo) {
      job.status = "error";

      return res.status(500).json({
        error: "Video was generated but no video file was returned."
      });
    }

    const fileName = `${req.params.jobId}.mp4`;
    const downloadPath = path.join(generatedDir, fileName);

    await ai.files.download({
      file: generatedVideo,
      downloadPath: downloadPath
    });

    job.status = "done";
    job.videoUrl = `/generated/${fileName}`;

    res.json({
      status: "done",
      url: job.videoUrl
    });

  } catch (error) {
    console.error("VIDEO STATUS ERROR:", error);

    res.status(500).json({
      error: error.message || "Video status check failed."
    });
  }
});


/* WEBSITE */
app.get("/{*splat}", (req, res) => {
  res.sendFile(
    path.join(__dirname, "public", "index.html")
  );
});


app.listen(PORT, () => {
  console.log(`DM Hub running on http://localhost:${PORT}`);
});
