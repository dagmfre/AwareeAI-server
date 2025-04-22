# DocRag: Documentation-Aware RAG Web App

## Overview
DocRag is a web application that allows users to interact with AI models using documentation. It leverages the MERN stack (MongoDB, Express, React, Node.js) along with TypeScript for type safety and improved developer experience. The application utilizes R2R for Retrieval-Augmented Generation (RAG) capabilities and SciPhi Cloud for document storage.

## Features
- User authentication and management
- Document upload and management
- Chat functionality with AI models
- Search capabilities across user and shared documents
- Document sharing with access control

## Project Structure
The backend is organized into several directories and files, each serving a specific purpose:

- **src/config**: Configuration files for database connection, default settings, and R2R client setup.
- **src/controllers**: Contains the logic for handling requests related to authentication, chat, documents, search, and shared documents.
- **src/middleware**: Middleware for authentication, error handling, and file uploads.
- **src/models**: Mongoose models for User, Chat, and SharedDoc.
- **src/routes**: API routes for authentication, chat, document management, search, and shared documents.
- **src/types**: TypeScript types and interfaces for various functionalities.
- **src/utils**: Utility functions for access control, R2R interactions, and input validation.
- **src/app.ts**: Main application setup.
- **src/server.ts**: Entry point for the application.

## Installation
1. Clone the repository:
   ```
   git clone <repository-url>
   cd docrag/backend
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file in the backend directory and add the necessary environment variables:
   ```
   MONGO_URI=<your_mongo_uri>
   JWT_SECRET=<your_jwt_secret>
   R2R_API_KEY=<your_r2r_api_key>
   R2R_BASE_URL=<your_r2r_base_url>
   PORT=5000
   ```

4. Start the server:
   ```
   npm run dev
   ```

## Usage
- **Authentication**: Users can register and log in to access their documents and chat history.
- **Document Management**: Users can upload documents to SciPhi Cloud and manage their document library.
- **Chat with AI**: Users can create chats and send messages to AI models, utilizing their documents for context.
- **Search**: Users can search through their documents and shared documents for specific content.

## Contributing
Contributions are welcome! Please open an issue or submit a pull request for any enhancements or bug fixes.

## License
This project is licensed under the MIT License. See the LICENSE file for details.