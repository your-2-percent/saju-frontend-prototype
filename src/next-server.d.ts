declare module "next/server" {
  export interface NextRequest {}
  export class NextResponse {
    static json(body: any, init?: any): any;
  }
}
