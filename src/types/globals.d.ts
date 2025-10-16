interface ApiResponse<T = any> {
  success: boolean;  
  message: string;   
  data: T | null;    
  error: any;        
  meta: Meta | null; 
}