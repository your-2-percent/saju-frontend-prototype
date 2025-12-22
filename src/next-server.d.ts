declare module "next/server" {
  export type NextRequest = Request;
  export class NextResponse {
    static json(body: unknown, init?: ResponseInit): Response;
  }
}
