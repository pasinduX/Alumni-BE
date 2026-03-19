import type { Profile } from "../generated/prisma/client";

export interface RegisterRequest {
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
}

export interface UpdateProfileBody {
  fullName?: string;
  biography?: string;
  linkedinUrl?: string;
}

export type ProfileResponse = Profile;

export interface PlaceBidBody {
  amount: number;
}

export type BidStatus = "winning" | "losing" | "none";

export interface BidStatusResponse {
  status: BidStatus;
}

export interface ApiError {
  error: string;
}
