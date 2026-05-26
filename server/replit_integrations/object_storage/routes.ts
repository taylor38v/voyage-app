import type { Express } from "express";
import {
  ObjectStorageService,
  ObjectNotFoundError,
  ObjectStorageUnavailableError,
  isObjectStorageEnabled,
} from "./objectStorage";

export function registerObjectStorageRoutes(app: Express): void {
  const objectStorageService = new ObjectStorageService();

  app.post("/api/uploads/request-url", async (req, res) => {
    if (!isObjectStorageEnabled) {
      return res.status(503).json({
        error: "object_storage_unavailable",
        message:
          "L'upload de fichiers n'est pas configuré sur cet environnement. Contactez l'administrateur.",
      });
    }
    try {
      const { name, size, contentType } = req.body;

      if (!name) {
        return res.status(400).json({
          error: "Missing required field: name",
        });
      }

      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      const objectPath = objectStorageService.normalizeObjectEntityPath(uploadURL);

      res.json({
        uploadURL,
        objectPath,
        metadata: { name, size, contentType },
      });
    } catch (error) {
      if (error instanceof ObjectStorageUnavailableError) {
        return res.status(503).json({
          error: "object_storage_unavailable",
          message: error.message,
        });
      }
      console.error("Error generating upload URL:", error);
      res.status(500).json({ error: "Failed to generate upload URL" });
    }
  });

  app.get("/objects/{*objectPath}", async (req, res) => {
    if (!isObjectStorageEnabled) {
      return res.status(404).json({ error: "Object not found" });
    }
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      await objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error serving object:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.status(404).json({ error: "Object not found" });
      }
      return res.status(500).json({ error: "Failed to serve object" });
    }
  });
}
