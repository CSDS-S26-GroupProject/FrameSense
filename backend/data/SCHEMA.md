# FrameSense Data Schema & Hosting Strategy

## 1. Data Schema (Firestore / NoSQL)

Based on the application's need to match facial measurements with glasses specifications, the following schema is proposed. This structure supports the "Fit Score" calculation and the 3D visualization.

### **Collection: `users`**
Stores user profiles and their computed facial metrics.

| Field | Type | Description |
|---|---|---|
| `uid` | string | Unique User ID (from Firebase Auth) |
| `email` | string | User's email address |
| `displayName` | string | User's full name |
| `faceData` | map | Saved anatomical measurements |
| &nbsp;&nbsp;`interpupillaryDistanceMm`| number | Distance between pupils (critical for fit) |
| &nbsp;&nbsp;`faceWidthMm` | number | Width of face at temples |
| &nbsp;&nbsp;`bridgeWidthMm` | number | Width of nose bridge |
| `faceShape` | string | Detected shape (e.g., "oval", "square") |
| `preferences` | map | User style preferences |
| &nbsp;&nbsp;`likedStyles` | array | e.g., ["aviator", "round"] |
| `createdAt` | timestamp | Account creation date |

---

### **Collection: `glasses`**
The product catalog. Contains physical dimensions required for the "Fit Score" algorithm and references to 3D assets.

| Field | Type | Description |
|---|---|---|
| `id` | string | SKU or Unique ID (e.g., "rayban-aviator-gold") |
| `name` | string | Display name of the product |
| `brand` | string | Manufacturer name |
| `price` | number | Price in USD |
| `style` | string | Style category (e.g., "cat-eye", "wayfarer") |
| `dimensions` | map | **Critical for Fit Score** |
| &nbsp;&nbsp;`frameWidthMm` | number | Total width of the frame front |
| &nbsp;&nbsp;`bridgeWidthMm` | number | Distance between lenses |
| &nbsp;&nbsp;`templeLengthMm` | number | Length of the arms |
| &nbsp;&nbsp;`lensHeightMm` | number | Vertical height of the lens |
| `fitMetadata` | map | Helper data for recommendations |
| &nbsp;&nbsp;`recommendedShapes`| array | Face shapes this frame suits (e.g., ["oval", "heart"]) |
| `assets` | map | Links to hosted files |
| &nbsp;&nbsp;`modelUrl` | string | Path to `.glb` file (e.g., `gs://bucket/models/glass1.glb`) |
| &nbsp;&nbsp;`thumbnailUrl` | string | Path to preview image |
| `stock` | number | Available inventory |

---

### **Collection: `savedFits` (or `users/{uid}/history`)**
Records of virtual try-on sessions.

| Field | Type | Description |
|---|---|---|
| `id` | string | Session ID |
| `userId` | string | Reference to `users` |
| `glassesId` | string | Reference to `glasses` |
| `fitScore` | number | Calculated score (0-100) |
| `fitNotes` | array | Specific feedback (e.g., "Bridge too wide") |
| `timestamp` | timestamp | When the try-on occurred |

---

## 2. Web Hosting & Infrastructure

To host FrameSense effectively, especially with its 3D and computer vision components, consider the following architecture.

### **Frontend Hosting (Vite/React)**
- **Provider:** Vercel, Netlify, or Firebase Hosting.
- **Requirement:** Must support Single Page Application (SPA) routing (rewrites to `index.html`).
- **SSL:** Mandatory for webcam access (`getUserMedia` requires HTTPS).

### **Asset Hosting (The "Heavy" Lifting)**
The `.glb` (3D models) and texture files should be separated from the main application bundle to ensure fast load times.

- **Storage Solution:** Firebase Storage or AWS S3.
- **CDN:** Serve assets via a CDN (Cloudflare or CloudFront) to reduce latency.
- **Format:** Ensure models are compressed (Draco compression) to minimize download size for mobile users.

### **Backend / Database**
- **Database:** Firebase Firestore (as modeled above) for real-time syncing of user data.
- **Auth:** Firebase Authentication (Google/Email).
- **Compute (Optional):** If the "Fit Score" algorithm becomes too complex for the client-side (browser), offload it to a serverless function (Firebase Cloud Functions or AWS Lambda) to protect the proprietary math.

### **Docker Deployment (for Custom Infra)**
If self-hosting (e.g., DigitalOcean, AWS EC2):
1. **Container:** Use the provided `Dockerfile` (multi-stage build).
2. **Orchestration:** `docker-compose` for local dev; Kubernetes or ECS for scale.
3. **Reverse Proxy:** Nginx (included in Dockerfile) to handle gzip compression and caching headers for 3D assets.

## 3. The Data Contract (Runtime State)
This mirrors the `contract.ts` in your frontend code and represents the live application state managed by Zustand.

```typescript
interface FrameSenseState {
    // 1. Input: Real-time Computer Vision
    rawLandmarks: Point3D[];    // 468 facial points
    headPose: HeadPose;         // Pitch, Yaw, Roll

    // 2. Logic: Fit Calculation
    faceMeasurements: {
        ipd: number;            // Interpupillary distance
        templeWidth: number;    // Width at temples
    };

    // 3. Output: User Feedback
    fitScore: number;           // 0-100 match confidence
    recommendation: "Perfect" | "Good" | "Poor";
}
```
