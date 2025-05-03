export interface Material {
  id: string
  name: string
  type?: string
  created_at?: string
  course_id?: string
}

export interface Problem {
  id: string
  question: string
  assignment_id: string
  answer?: string
  diagram?: {
    pageNumber: number
    crop: Crop
    imageData?: string
    image_url?: string
  }
  image_url?: string
  index?: number
}

export interface Assignment {
  id: string
  name: string
  due_date: string
  description: string
  material_ids: string[]
  problem_count?: number
  pdf_url?: string
}

export interface Course {
  id: string
  name: string
  course_code: string
  description: string
  materials: Material[]
  join_code: string
  assignments: any[]
  instructor_name?: string
}

export interface Crop {
  x: number
  y: number
  width: number
  height: number
  unit: 'px' | '%'
} 