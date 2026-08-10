export interface CreateInstituteDto {
  name: string;
  code: string;
  email?: string;
  phone?: string;
  address?: string;
}

export interface UpdateInstituteDto {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  status?: "ACTIVE" | "INACTIVE" | "SUSPENDED";
}
