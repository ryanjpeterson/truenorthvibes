# True North Vibes Template Project

## Next.js/Strapi Docker & Nginx Configuration

### **1\. Backend Dockerization (`Dockerfile.backend`)**

The backend is built using a multi-stage process to ensure the final image is small and secure.

* **Stage 1: Build Environment**: It starts with a `node:20.18.1-alpine` base to install build tools (like `gcc`, `vips-dev`, and `git`) required for compiling native Node.js modules.  
* **Dependency Management**: `npm ci` is used to install dependencies exactly as defined in the lockfile, ensuring build consistency.  
* **Application Build**: The command `npm run build` compiles TypeScript into the `dist/` directory and generates the Strapi Admin panel.  
* **Stage 2: Production Runner**: A fresh `node:20-alpine` image is used to discard build-time bloat.  
* **Security Hardening**: The script creates a `node` user and changes ownership of `/opt/app` to this user. By using `USER node`, the application runs with "least privilege," meaning a compromised container cannot easily access the host system.  
* **Selective Copying**: Only the compiled `dist/`, `public/` assets, and production-only dependencies are copied over, keeping the image lightweight.

### **2\. Frontend Dockerization (`Dockerfile.frontend`)**

Similar to the backend, the Next.js frontend utilizes a highly optimized three-stage build.

* **Dependency Stage**: Installs the `libc6-compat` library, which is necessary for certain Next.js features to run correctly on Alpine Linux.  
* **Builder Stage**: Injects build-time arguments (like `NEXT_PUBLIC_STRAPI_URL`) into the environment. This is necessary because Next.js bakes these values into the client-side JavaScript during the build process.  
* **Runner Stage**: Utilizes Next.js's "standalone" output mode, which packages only the files needed for production, significantly reducing image size.  
* **Healthcheck Support**: `curl` is installed specifically so the Docker healthcheck can verify if the frontend is responding.  
* **Non-Root Execution**: Like the backend, it creates a `nextjs` system user to run the server, adhering to security best practices.

### **3\. Service Orchestration (`docker-compose.yaml`)**

This file manages how your database, backend, and frontend interact as a single system.

* **Database Isolation**: The `postgres` service is placed on an `internal-db` network with `internal: true`, preventing any direct access from the public internet.  
* **Postgres Hardening**: It uses `read_only: true` with `tmpfs` mounts for `/tmp` and `/var/run/postgresql`. This prevents persistent changes to the container's root filesystem, a key defense against malware.  
* **Blue/Green Deployment**: You have defined two instances for both the backend and frontend (`blue` and `green`). This allows you to update one version while the other remains live, ensuring zero-downtime deployments.  
* **Host-Only Binding**: Ports are mapped to `127.0.0.1` (e.g., `127.0.0.1:${BACKEND_PORT_BLUE}:1337`). This is a critical security measure that forces all incoming traffic to go through your Nginx proxy rather than hitting the containers directly on their public ports.  
* **Resource Limits**: Each application container is limited to 1GB of memory to prevent a single service from crashing the entire VPS if a memory leak occurs.

### **4\. Web Server & Proxy (`nginx.config.template`)**

Nginx acts as the entry point for all users, handling security and routing.

* **HTTPS Enforcement**: All traffic on port 80 is immediately redirected to port 443 (HTTPS) to ensure data is encrypted in transit.  
* **SSL Hardening**: It restricts protocols to `TLSv1.2` and `TLSv1.3` and enables `ssl_prefer_server_ciphers`, which protects against older, known SSL vulnerabilities.  
* **Security Headers**:  
  * **HSTS**: Forces browsers to only use HTTPS for the next year.  
  * **X-Frame-Options**: Prevents clickjacking by forbidding the site from being rendered in an iframe.  
  * **CSP**: The Content Security Policy restricts where scripts and images can be loaded from, including a specific exception for YouTube embeds.  
* **Reverse Proxying**:  
  * **Static Assets**: `/uploads/` are proxied to the backend container to serve user-uploaded images.  
  * **API & Admin**: Requests to `/api/` or the Strapi admin panel are routed to the backend.  
  * **Frontend**: All other traffic (`/`) is routed to the Next.js frontend container.

