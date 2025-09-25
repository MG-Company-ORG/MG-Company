// Database types for the job platform

export type UserType = 'employer' | 'jobseeker'
export type UserRole = 'user' | 'admin'
export type PostStatus = 'active' | 'closed' | 'draft'
export type ApplicationStatus = 'pending' | 'accepted' | 'rejected' | 'withdrawn'

export interface Profile {
  id: string
  email: string
  role: UserRole
  user_type: UserType
  created_at: string
}

export interface Post {
  id: number
  user_id: string
  title: string
  details: string
  post_date: string
  pay: number | null
  location: string | null
  external_link: string | null
  application_deadline: string | null
  max_applicants: number | null
  status: PostStatus
  created_at: string
}

export interface Application {
  id: number
  post_id: number
  applicant_id: string
  status: ApplicationStatus
  message: string | null
  contact_info: {
    phone?: string
    email?: string
    preferredContact?: 'phone' | 'email'
  }
  applied_at: string
  updated_at: string
  // Relations
  post?: Post
  applicant?: Profile
}

export interface PostWithApplications extends Post {
  applications?: Application[]
  application_count?: number
}

export interface ApplicationWithPost extends Application {
  post: Post
}