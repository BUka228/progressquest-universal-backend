import {FieldValue, Timestamp} from "firebase-admin/firestore";

export interface TeamDocument {
  name: string;
  description: string | null;
  ownerUid: string;
  logoUrl: string | null;
  createdAt: Timestamp | FieldValue;
  updatedAt: Timestamp | FieldValue;
  settings: {[key: string]: any} | null;
  defaultMemberRole: "admin" | "editor" | "member" | "viewer";
}

export interface TeamMemberDocument {
  uid: string;
  displayName: string;
  avatarUrl: string | null;
  role: "owner" | "admin" | "editor" | "member" | "viewer";
  joinedAt: Timestamp | FieldValue;
}
