export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  dateJoined: Date;
  r2rDocumentIds: string[];
  sharedWithMe: string[];
}

export interface UserRegistration {
  name: string;
  email: string;
  password: string;
}

export interface UserLogin {
  email: string;
  password: string;
}