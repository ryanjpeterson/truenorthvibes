# True North Vibes Template Project

## **I. Application Architecture (Frontend & Backend)**

### **1. Backend Architecture (Strapi 5)**

The backend serves as a headless CMS, utilizing custom lifecycle hooks to optimize data for the frontend.

* **Searchable Content Lifecycle**: To support efficient full-text search without complex database queries, the backend uses a lifecycle hook in `lifecycles.ts`.
* **Text Extraction**: The `extractText` and `getPlainTextFromBody` functions recursively parse the nested JSON structures of Strapi's dynamic zones to flatten all content into a single string.
* **Automation**: These hooks (`beforeCreate` and `beforeUpdate`) automatically populate a `searchableContent` field whenever a post is saved or published, allowing the frontend to filter by title or content in a single operation.
* **Data Modeling**: The system manages `Post`, `Category`, and `Sponsor` entities. Posts use a dynamic `body` zone, allowing editors to compose articles using various components like text blocks, images, and YouTube embeds.

### **2. Frontend Architecture (Next.js 15)**

The frontend is a performance-optimized React application utilizing Server-Side Rendering (SSR) and Incremental Static Regeneration (ISR).

* **Core Utilities & Networking (`lib/`)**:
    * **Environment-Aware Networking**: The `strapi.ts` utility manages two URLs: `STRAPI_URL` for client-side browser requests and `STRAPI_INTERNAL_URL` for server-side requests within the Docker network.
    * **Resilient `fetchAPI`**: This wrapper standardizes API calls, implementing a mandatory 5-second timeout and detailed error logging.
    * **Fault Tolerance**: During SSR, `fetchAPI` returns empty fallback data instead of crashing the site if the CMS is temporarily unreachable.
* **Type System & Data Contracts (`types/`)**:
    * **Interface Mapping**: The `types/index.ts` file mirrors the Strapi data model, providing type safety for `Post`, `Sponsor`, and `Category` objects.
    * **Dynamic Component Modeling**: The `Block` interface enables the layout engine to handle various content types within the dynamic body zone.
    * **API Standardization**: The `StrapiResponse<T>` generic interface ensures every API response has a predictable structure for data and pagination.
* **Dynamic Rendering Engine**:
    * **`BlockRenderer.tsx`**: Acts as a central router that maps Strapi's JSON components to specific React components, such as `blog.text-block` or `blog.you-tube-embed`.
    * **SEO & Metadata**: The `generateMetadata` function dynamically generates OpenGraph and Twitter tags for each blog post using the title and hero image.

### **3. Integration Logic**

* **ISR Strategy**: Both the home and blog pages use `export const revalidate = 1;`, ensuring CMS updates are reflected almost instantly without a full site rebuild.
* **Internal Communication**: Next.js server components use the internal Docker service names (e.g., `http://backend-blue:1337`) to fetch data, bypassing the public internet for better speed and security.

---

## **II. Infrastructure & Deployment (Docker & Nginx)**

### **1. Backend Dockerization (`Dockerfile.backend`)**

* **Multi-Stage Build**: Uses a build stage to compile TypeScript and a production stage to run the app with minimal dependencies.
* **Least Privilege**: Runs as a non-root `node` user and includes `vips` for production image processing.

### **2. Frontend Dockerization (`Dockerfile.frontend`)**

* **Next.js Standalone**: Utilizes the standalone output mode to package only the necessary files, drastically reducing the final image size.
* **System User**: Creates a dedicated `nextjs` system user and `nodejs` group to isolate the application process.

### **3. Service Orchestration (`docker-compose.yaml`)**

* **Blue/Green Strategy**: Defines identical `blue` and `green` environments for both frontend and backend to enable zero-downtime updates.
* **Hardened Security**: Every service is configured with `read_only: true`, `no-new-privileges:true`, and all kernel capabilities dropped by default (`cap_drop: - ALL`).
* **Network Isolation**: The PostgreSQL database is locked within an `internal: true` network, making it invisible to the public internet.

### **4. Web Server & Proxy (`nginx.config.template`)**

* **HTTPS & SSL Hardening**: Enforces HTTPS and uses modern TLS protocols (`v1.2` and `v1.3`) with session caching for performance.
* **Security Headers**: Implements `HSTS`, `X-Frame-Options`, and a custom `Content-Security-Policy` that allows YouTube embeds while blocking unauthorized scripts.
* **Centralized Routing**: Acts as the single entry point, proxying traffic to the appropriate frontend or backend containers while hiding the underlying container ports from the public.

---

## **III. Server Setup & Initialization**

1.  **Environment Configuration**: Copy `.env.template` to `.env` and fill in all mandatory variables, including domain names and secret keys.
2.  **Run Setup Script**: Execute `./scripts/setup.sh` to generate the Nginx configuration from the template using `envsubst`.
3.  **Site Activation**: The script automatically copies the configuration to `/etc/nginx/sites-available/` and creates a symlink in `sites-enabled/`.
4.  **Verification**: The script performs a final Nginx configuration test and reloads the service to apply changes.

---

## **IV. Deployment Workflow**

1.  **Smart Deployment**: Run `./scripts/deploy.sh` to initiate a zero-downtime Blue/Green deployment.
2.  **Change Detection**: The script identifies if the `frontend/` or `backend/` directories have changed since the last deployment using git hashes stored in `.deploy_state`, skipping unnecessary builds.
3.  **Force Rebuild**: Use the `--force` flag to ignore change detection and rebuild all services.
4.  **Health Verification**: Traffic is only switched in Nginx once the target container reports a `healthy` status via its health check.
5.  **Post-Deployment Cleanup**: The script automatically stops the previous color's containers after a successful traffic switch.

---

## **V. Maintenance & Disaster Recovery**

1.  **Production Backups**: Run `./scripts/backup-prod.sh` to trigger a Strapi export within the active production container and download the archive to the local `backend/backups/` directory.
2.  **Production Restore**: Use `./scripts/restore-prod.sh <path-to-file>` to upload a local backup and import it into the currently active production container.
3.  **Remote Access Requirements**: These maintenance scripts require `VPS_USER`, `VPS_HOST`, and `VPS_PORT` to be correctly defined in your `.env` file.

---

## **VI. Configuration Reference**

* **Global Variables**: `APP_NAME` and `DOMAIN_NAME` are used to name containers and configure Nginx routing.
* **Blue/Green Ports**: Ports like `BACKEND_PORT_BLUE` (1337) and `BACKEND_PORT_GREEN` (1338) must be unique and are mapped to `127.0.0.1` for security.
* **Strapi Secrets**: Mandatory security tokens including `APP_KEYS`, `API_TOKEN_SALT`, and `JWT_SECRET` must be set for backend functionality.
* **Server Communication**: `STRAPI_INTERNAL_URL` must point to the internal Docker service name (e.g., `http://backend-blue:1337`) for high-performance SSR.

---

## **VII. Local Development**

To run the project locally without the full production orchestration:
1. Ensure a local PostgreSQL instance is available and matches your `.env` settings.
2. Run `npm install` and `npm run dev` within the `backend/` and `frontend/` directories respectively.
3. Configure your local `.env` to point `NEXT_PUBLIC_STRAPI_URL` to `http://localhost:1337`.