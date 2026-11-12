import React, { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import Countdown from '../components/Countdown';
import TimeBar from '../components/TimeBar';
import ScorePanel from '../components/ScorePanel';
import QuestionCard from '../components/QuestionCard';
import { TIME_PER_QUESTION } from '../data';
import { calcPoints, calcTotal } from '../utils';

const Play = ({ questions, playerName }) => {
  const navigate = useNavigate();

  // 1. Khai báo dữ liệu và state ở đầu component
  const officialQuestions = questions.filter((q) => !q.reserve);

  const [status, setStatus] = useState('countdown'); // "countdown" | "answering" | "revealed"
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TIME_PER_QUESTION);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [addedPoints, setAddedPoints] = useState(0);

  const currentQ = officialQuestions[currentIndex];

  // 2. Hàm xử lý khi chọn đáp án hoặc hết giờ
  const handleAnswer = (chosenIdx, remainingTime = timeLeft) => {
    if (status !== 'answering') return;
    setStatus('revealed');
    setSelectedAnswer(chosenIdx);

    const isCorrect = chosenIdx !== null && currentQ && chosenIdx === currentQ.answer;
    let earned = 0;

    if (isCorrect && currentQ) {
      earned = calcPoints(currentQ, remainingTime);
      setScore((prev) => prev + earned);
      setCorrectCount((prev) => prev + 1);
      setAddedPoints(earned);
    } else {
      setAddedPoints(0);
    }

    if (currentQ) {
      const newRecord = {
        id: currentQ.id,
        chosen: chosenIdx,
        correct: currentQ.answer,
        timeLeft: remainingTime,
        points: earned
      };
      setAnswers((prev) => [...prev, newRecord]);
    }
  };

  // 3. Timer đếm ngược 15 giây mỗi câu (Chỉ chạy khi status là "answering")
  useEffect(() => {
    if (status !== 'answering') return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleAnswer(null, 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [status, currentIndex]);

  // 4. Bước chờ 1.5 giây để chuyển câu tiếp theo hoặc kết thúc
  useEffect(() => {
    if (status !== 'revealed') return;

    const timeout = setTimeout(() => {
      if (currentIndex + 1 < officialQuestions.length) {
        setCurrentIndex((prev) => prev + 1);
        setTimeLeft(TIME_PER_QUESTION);
        setSelectedAnswer(null);
        setAddedPoints(0);
        setStatus('answering');
      } else {
        const finalAnswers = answers;
        const finalScore = calcTotal(finalAnswers);
        navigate('/result', {
          replace: true,
          state: {
            playerName,
            answers: finalAnswers,
            score: finalScore,
            correctCount
          }
        });
      }
    }, 1500);

    return () => clearTimeout(timeout);
  }, [status, currentIndex, officialQuestions.length, answers, correctCount, playerName, navigate]);

  // 5. ĐẶT TOÀN BỘ CÂU LỆNH RETURN ĐIỀU KIỆN SAU CÁC HOOKS
  if (!playerName || !playerName.trim()) {
    return <Navigate to="/" replace />;
  }

  if (officialQuestions.length === 0) {
    return <p>Đang chuẩn bị câu hỏi...</p>;
  }

  return (
    <div style={{ maxWidth: '750px', margin: '0 auto' }}>
      {status === 'countdown' ? (
        <Countdown onFinish={() => setStatus('answering')} />
      ) : (
        <div>
          <ScorePanel score={score} correctCount={correctCount} addedPoints={addedPoints} />
          <TimeBar timeLeft={timeLeft} />
          {currentQ && (
            <QuestionCard
              question={currentQ}
              currentIndex={currentIndex}
              totalQuestions={officialQuestions.length}
              onSelectAnswer={(idx) => handleAnswer(idx, timeLeft)}
              selectedAnswer={selectedAnswer}
              isRevealed={status === 'revealed'}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default Play;