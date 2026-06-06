export interface DataFBResponse{
    id: string;
    group_name: string;
    total_posts_24h?: number;
    
    link_group?: string;
    post_url: string;
    group_url: string;
    date: string;
    dateCrawl:Date,
    intent?: string;
    reactions: number;
    comments: number;
    shares: number;
    score: number;
    content?: string;
    media_url: string | null;
    image_urls: string[];
    industry?: string;
    tier?: number;
    team?: string[] | string;
    icp?: string[] | string;
    icp_desc?: string;
}
export interface CrawlIntentOption {
    value: string;
    label: string;
}
export interface FacebookGroupDTO {
    id: string;                     // Tương ứng: str
    group_name: string;             // Tương ứng: str
    group_url: string;                    // Tương ứng: str
    intent: string;                 // Tương ứng: str
    members?: number | null;        // Tương ứng: Optional[int]
    last_crawl?: string | null;    // Tương ứng: Optional[str] 
    date_crawl?: string | null;    // Tương ứng: Optional[str] 
    posts_per_week?: number | null; // Tương ứng: Optional[int]
    health_score?: number | null;   // Tương ứng: Optional[float]
    chay_24h?: boolean | null;      // Tương ứng: Optional[bool]
    status?: "ACTIVE" | "IDLE" | "DEAD"; 
    // Taxonomy fields
    platform?: string; // "facebook" | "linkedin"
    industry?: string;
    tier?: number;
    team?: string[] | string;
    icp?: string[] | string;
    icp_desc?: string;
    id_intent?: string | null;
    id_member:string
}