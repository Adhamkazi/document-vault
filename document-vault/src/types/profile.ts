export type Profile = {
  id: string;

  userId: string;

  name: string;

  email: string | null;

  phone: string | null;

  address: string | null;

  pin: string | null;

  avatar: string | null;

  isOwner: number;

  createdAt: number;

};