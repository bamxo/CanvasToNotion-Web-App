# Canvas to Notion Frontend

The frontend application for the Canvas to Notion integration, built with React, TypeScript, and Vite.

## Prerequisites

- Node.js (v18 or higher)
- npm (v9 or higher)

## Installation

1. Navigate to the frontend directory:
```bash
cd CanvasToNotion-Web-App/frontend
```

2. Install dependencies:
```bash
npm install
```

## Development

To start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

## Environment Variables

Create a `.env` file in the frontend directory with the following variables:

```
VITE_GOOGLE_CLIENT_ID=your_google_client_id
```

This is required for Google Sign-In functionality in both the login and signup flows.

## Project Structure

```
frontend/
├── src/              # Source code
│   ├── components/   # React components
│   ├── assets/      # Static assets
│   ├── utils/       # Utility functions
│   ├── hooks/       # Custom React hooks
│   └── test/        # Test files
├── public/          # Public assets
└── dist/           # Build output
```

## Dependencies

### Core Dependencies
- React 19
- Vite
- TailwindCSS
- Axios
- React Virtuoso
- tsParticles

### Development Dependencies
- TypeScript
- ESLint
- Vitest
- Testing Library
- Various TypeScript type definitions

## Testing

Run the test suite:
```bash
npm test
```

## Building for Production

To create a production build:
```bash
npm run build
```

The build output will be in the `dist` directory.

## Available Scripts

- `npm run dev`: Start development server
- `npm run build`: Build for production
- `npm test`: Run tests
- `npm run lint`: Run ESLint

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the ISC License. 