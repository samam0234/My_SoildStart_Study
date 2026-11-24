import { A } from "@solidjs/router";
import { HttpStatusCode } from "@solidjs/start";
export default function NotFound() {
    return <><HttpStatusCode code={404}/><h1>페이지를 찾을 수 없습니다</h1><A href="/">홈으로</A></>;
}
