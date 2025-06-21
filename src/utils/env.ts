import { ValidationError } from "../utils/errors";

const requiredEnvVars = [
  "SUPABASE_URL",
  "SUPABASE_SERVICE_KEY",
  "R2R_API_URL",
  "R2R_API_KEY",
];

export const validateEnvironment = (): void => {
  const missingVars = requiredEnvVars.filter(
    (varName) => !process.env[varName]
  );

  if (missingVars.length > 0) {
    throw new ValidationError(
      `Missing required environment variables: ${missingVars.join(", ")}`
    );
  }
};
