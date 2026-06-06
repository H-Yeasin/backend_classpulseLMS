# Opalmer Backend

This is the backend service for the Opalmer Education platform. It provides RESTful APIs, real-time communication via WebSockets, and integrations with AI and cloud storage services.

## Technologies Used
- **Node.js & Express**: Core framework for building the REST API.
- **TypeScript**: For static typing and robust code.
- **MongoDB & Mongoose**: NoSQL database and object data modeling.
- **Socket.io**: Real-time bidirectional event-based communication.
- **Zod**: TypeScript-first schema declaration and validation.
- **JWT & bcrypt**: Authentication and password hashing.
- **Cloudinary & Multer**: Media and file upload handling.
- **Generative AI (OpenAI & Google GenAI)**: Integration for AI features.
- **Nodemailer**: Email sending service.

## Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- MongoDB
- Cloudinary Account
- OpenAI / Google GenAI API Keys

### Installation

1. Navigate to the backend directory:
   ```bash
   cd opalmer-backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file based on `.env.example` and fill in your credentials.

### Running the Server

- **Development Mode**:
  ```bash
  npm run dev
  ```
- **Production Build**:
  ```bash
  npm run build
  npm start
  ```

## Available Scripts
- `npm run dev`: Starts the development server with live reload using `ts-node-dev`.
- `npm run build`: Compiles TypeScript source code to JavaScript.
- `npm start`: Runs the compiled server from the `dist` directory.
- `npm run lint`: Lints the codebase using ESLint.
