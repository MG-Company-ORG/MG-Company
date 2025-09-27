// Database types for the job platform

export type UserType = "employer" | "jobseeker";
export type UserRole = "user" | "admin";
export type PostStatus = "active" | "closed" | "draft";
export type ApplicationStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "withdrawn";
export type NotificationType =
  | "new_application"
  | "application_status_change"
  | "system"
  | "admin";

export interface Profile {
  id: string;
  email: string;
  role: UserRole;
  user_type: UserType | null;
  created_at: string;
  is_suspended?: boolean | null;
  suspension_reason?: string | null;
}

export interface Post {
  id: number;
  user_id: string;
  title: string;
  details: string;
  post_date: string;
  pay: number | null;
  location: string | null;
  external_link: string | null;
  application_deadline: string | null;
  max_applicants: number | null;
  status: PostStatus;
  created_at: string;
}

export interface Application {
  id: number;
  post_id: number;
  applicant_id: string;
  status: ApplicationStatus;
  message: string | null;
  contact_info: {
    phone?: string;
    email?: string;
    preferredContact?: "phone" | "email";
  };
  resume_file_url?: string | null;
  cover_letter_file_url?: string | null;
  additional_files?: string[];
  applied_at: string;
  updated_at: string;
  // Relations
  post?: Post;
  applicant?: Profile;
}

export interface Banner {
  id: number;
  title: string;
  image_url: string;
  link_url?: string | null;
  is_active: boolean;
  display_order: number;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: number;
  user_id: string;
  type: NotificationType;
  title: string;
  message?: string | null;
  data?: Record<string, any>;
  is_read: boolean;
  created_at: string;
}

export interface UserSuspension {
  id: number;
  user_id: string;
  admin_id: string;
  reason: string;
  suspended_until?: string | null;
  is_permanent: boolean;
  is_active: boolean;
  created_at: string;
  // Relations
  user?: Profile;
  admin?: Profile;
}

export interface PostWithApplications extends Post {
  applications?: Application[];
  application_count?: number;
}

export interface ApplicationWithPost extends Application {
  post: Post;
}

export interface ProfileWithSuspensions extends Profile {
  suspensions?: UserSuspension[];
  active_suspension?: UserSuspension;
}
