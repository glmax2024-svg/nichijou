/**
 * 去掉模型偶尔仍会写出的动作描写（*照れる*、（目をそらす））。
 * 提示词里已经禁止，这里兜底，只删明显是舞台说明的部分：
 * - 星号包住的片段（同一行内）
 * - 整行都被括号包住的行
 */
const ASTERISK = /[*＊][^*＊\n]{1,120}[*＊]/g;
const PAREN_LINE = /^[ \t　]*[（(][^）)\n]{1,120}[）)][ \t　]*$/gm;

export function stripStageDirections(text: string): string {
  const cleaned = text
    .replace(ASTERISK, "")
    .replace(PAREN_LINE, "")
    .replace(/[ \t　]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  // 万一整段都是描写，宁可原样返回也不要发空消息
  return cleaned || text.trim();
}
