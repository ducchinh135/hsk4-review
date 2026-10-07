import { useState } from 'react';
import { checkPinyin } from '../quiz.js';

// Type the pinyin for a hanzi. Remount (via `key`) per question.
export default function PinyinQuestion({ q, answered, onAnswer, noTones }) {
  const [text, setText] = useState('');
  const submit = (e) => {
    e.preventDefault();
    if (answered || !text.trim()) return;
    const result = checkPinyin(text, q.answer, { tones: !noTones });
    onAnswer(text, result === 'ok', result);
  };
  const state = answered ? (answered.ok ? ' correct' : ' wrong') : '';

  return (
    <form className="pinyin-form" onSubmit={submit}>
      <div className="quiz-prompt hanzi">{q.word[0]}</div>
      <input
        className={state.trim()}
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={!!answered}
        autoFocus
        placeholder={noTones ? 'vd: falv' : 'vd: fa3lv4 hoặc fǎlǜ'}
        autoCapitalize="off"
        autoCorrect="off"
        autoComplete="off"
        spellCheck={false}
        aria-label="Nhập pinyin"
      />
      {!answered && (
        <button className="btn" type="submit" disabled={!text.trim()}>
          Kiểm tra
        </button>
      )}
      {answered && !answered.ok && (
        <div className="quiz-verdict">
          {answered.result === 'tone' ? 'Sai dấu thanh' : 'Chưa đúng'} — đáp án: <b>{q.answer}</b>
        </div>
      )}
    </form>
  );
}
