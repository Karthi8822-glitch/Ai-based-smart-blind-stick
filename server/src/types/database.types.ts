export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      ai_detections: {
        Row: {
          bounding_box: Json | null
          confidence: number
          device_id: string
          id: number
          image_url: string | null
          inference_time_ms: number | null
          label: string
          model_name: string | null
          timestamp: string
        }
        Insert: {
          bounding_box?: Json | null
          confidence: number
          device_id: string
          id?: never
          image_url?: string | null
          inference_time_ms?: number | null
          label: string
          model_name?: string | null
          timestamp?: string
        }
        Update: {
          bounding_box?: Json | null
          confidence?: number
          device_id?: string
          id?: never
          image_url?: string | null
          inference_time_ms?: number | null
          label?: string
          model_name?: string | null
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_detections_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["device_id"]
          },
        ]
      }
      alerts: {
        Row: {
          acknowledged: boolean
          device_id: string
          gps_latitude: number | null
          gps_longitude: number | null
          id: number
          message: string
          severity: string
          timestamp: string
          type: string
        }
        Insert: {
          acknowledged?: boolean
          device_id: string
          gps_latitude?: number | null
          gps_longitude?: number | null
          id?: never
          message: string
          severity?: string
          timestamp?: string
          type: string
        }
        Update: {
          acknowledged?: boolean
          device_id?: string
          gps_latitude?: number | null
          gps_longitude?: number | null
          id?: never
          message?: string
          severity?: string
          timestamp?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "alerts_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["device_id"]
          },
        ]
      }
      devices: {
        Row: {
          api_key_hash: string | null
          battery_level: number | null
          created_at: string
          device_id: string
          emergency_contact: string | null
          firmware_version: string | null
          id: string
          last_seen: string | null
          metadata: Json | null
          name: string
          owner_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          api_key_hash?: string | null
          battery_level?: number | null
          created_at?: string
          device_id: string
          emergency_contact?: string | null
          firmware_version?: string | null
          id?: string
          last_seen?: string | null
          metadata?: Json | null
          name?: string
          owner_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          api_key_hash?: string | null
          battery_level?: number | null
          created_at?: string
          device_id?: string
          emergency_contact?: string | null
          firmware_version?: string | null
          id?: string
          last_seen?: string | null
          metadata?: Json | null
          name?: string
          owner_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "devices_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      live_sensor_data: {
        Row: {
          alert_state: string | null
          battery_percentage: number | null
          battery_voltage: number | null
          camera_status: string | null
          device_id: string
          front_distance_cm: number
          gps_latitude: number | null
          gps_longitude: number | null
          gps_status: string | null
          id: number
          left_distance_cm: number
          obstacle_level: string
          right_distance_cm: number
          sim_status: string | null
          timestamp: string
          updated_at: string
        }
        Insert: {
          alert_state?: string | null
          battery_percentage?: number | null
          battery_voltage?: number | null
          camera_status?: string | null
          device_id: string
          front_distance_cm?: number
          gps_latitude?: number | null
          gps_longitude?: number | null
          gps_status?: string | null
          id?: never
          left_distance_cm?: number
          obstacle_level?: string
          right_distance_cm?: number
          sim_status?: string | null
          timestamp?: string
          updated_at?: string
        }
        Update: {
          alert_state?: string | null
          battery_percentage?: number | null
          battery_voltage?: number | null
          camera_status?: string | null
          device_id?: string
          front_distance_cm?: number
          gps_latitude?: number | null
          gps_longitude?: number | null
          gps_status?: string | null
          id?: never
          left_distance_cm?: number
          obstacle_level?: string
          right_distance_cm?: number
          sim_status?: string | null
          timestamp?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_sensor_data_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: true
            referencedRelation: "devices"
            referencedColumns: ["device_id"]
          },
        ]
      }
      locations: {
        Row: {
          address: string | null
          altitude: number | null
          device_id: string
          id: number
          latitude: number
          longitude: number
          speed: number | null
          timestamp: string
        }
        Insert: {
          address?: string | null
          altitude?: number | null
          device_id: string
          id?: never
          latitude: number
          longitude: number
          speed?: number | null
          timestamp?: string
        }
        Update: {
          address?: string | null
          altitude?: number | null
          device_id?: string
          id?: never
          latitude?: number
          longitude?: number
          speed?: number | null
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "locations_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["device_id"]
          },
        ]
      }
      obstacles: {
        Row: {
          bounding_box: Json | null
          confidence: number | null
          danger_level: string | null
          detected_at: string
          device_id: string
          distance: number
          id: number
          label: string
        }
        Insert: {
          bounding_box?: Json | null
          confidence?: number | null
          danger_level?: string | null
          detected_at?: string
          device_id: string
          distance: number
          id?: never
          label: string
        }
        Update: {
          bounding_box?: Json | null
          confidence?: number | null
          danger_level?: string | null
          detected_at?: string
          device_id?: string
          distance?: number
          id?: never
          label?: string
        }
        Relationships: [
          {
            foreignKeyName: "obstacles_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["device_id"]
          },
        ]
      }
      sensor_history: {
        Row: {
          battery_percentage: number | null
          battery_voltage: number | null
          device_id: string
          front_distance_cm: number | null
          gps_latitude: number | null
          gps_longitude: number | null
          id: number
          left_distance_cm: number | null
          obstacle_level: string | null
          right_distance_cm: number | null
          timestamp: string
        }
        Insert: {
          battery_percentage?: number | null
          battery_voltage?: number | null
          device_id: string
          front_distance_cm?: number | null
          gps_latitude?: number | null
          gps_longitude?: number | null
          id?: never
          left_distance_cm?: number | null
          obstacle_level?: string | null
          right_distance_cm?: number | null
          timestamp?: string
        }
        Update: {
          battery_percentage?: number | null
          battery_voltage?: number | null
          device_id?: string
          front_distance_cm?: number | null
          gps_latitude?: number | null
          gps_longitude?: number | null
          id?: never
          left_distance_cm?: number | null
          obstacle_level?: string | null
          right_distance_cm?: number | null
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "sensor_history_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["device_id"]
          },
        ]
      }
      users: {
        Row: {
          assigned_device_id: string | null
          created_at: string
          email: string
          id: string
          name: string
          password: string
          role: string
          updated_at: string
        }
        Insert: {
          assigned_device_id?: string | null
          created_at?: string
          email: string
          id?: string
          name: string
          password: string
          role?: string
          updated_at?: string
        }
        Update: {
          assigned_device_id?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string
          password?: string
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
