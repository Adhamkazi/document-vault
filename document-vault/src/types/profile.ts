import {UserRole} from "@/src/services/loginUser"

export type Profile = {
  id: string;

  userId: string;

  name: string;

  email: string | null;

  phone: string | null;

  address: string | null;
  
  role: UserRole ;  

  vaultOwnerEmail?: string | null;   

  sharedFolderId: string | null;

  pin: string | null;

  avatar: string | null;

  isOwner: number;

  createdAt: number;

};