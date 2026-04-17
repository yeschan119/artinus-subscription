import axios from "axios";
import createHttpError from "http-errors";

export class CsrngService {
  async getRandomCommitFlag() {
    try {
      const response = await axios.get(
        process.env.CSRNG_URL ??
          "https://csrng.net/csrng/csrng.php?min=0&max=1"
      );

      return response.data[0].random;
    } catch {
      throw createHttpError(503, "외부 API 호출 실패");
    }
  }
}