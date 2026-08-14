window.QUIZ_DATA = {"meta":{"title":"Câu hỏi, đáp án trắc nghiệm kiểm tra nhận thức về Đảng năm 2025","source":"cau_hoi_lop_nhan_thuc_ve_Dang(1).docx","total":116,"correctAnswerRule":"Trong tài liệu nguồn, đáp án đúng của mọi câu là phương án A.","difficultyRanges":{"easy":{"label":"Mức 1","from":1,"to":64,"count":64},"normal":{"label":"Mức 2","from":65,"to":96,"count":32},"hard":{"label":"Mức 3","from":97,"to":116,"count":20}},"sourceDeclaredCounts":{"level1":59,"level2":27,"level3":20},"note":"Số câu thực tế trích xuất theo các dòng bắt đầu bằng # là 64/32/20; tiêu đề trong tài liệu ghi 59/27/20."},"questions":(window.QUIZ_QUESTIONS||[])};

// Đồng bộ toàn bộ nhãn giao diện với cấu hình bài kiểm tra 25 câu / 30 phút.
(() => {
  const setText = (selector, text) => {
    const el = document.querySelector(selector);
    if (el) el.textContent = text;
  };

  const countSelect = document.getElementById("questionCount");
  if (countSelect && !countSelect.querySelector('option[value="25"]')) {
    const opt = document.createElement("option");
    opt.value = "25";
    opt.textContent = "25 câu";
    countSelect.appendChild(opt);
  }
  if (countSelect) countSelect.value = "25";

  setText(".navbar .badge.rounded-pill", "25 câu • 30 phút");
  const lead = document.querySelector("#homeView .lead");
  if (lead) lead.innerHTML = 'Ngân hàng mới gồm 116 câu. Mỗi bài kiểm tra lấy ngẫu nhiên <strong>25 câu</strong> và làm trong <strong>30 phút</strong>.';

  const specStrong = document.querySelector("#homeView .spec-card strong");
  if (specStrong) specStrong.textContent = "25";

  const examModeNote = document.querySelector('#modeControl button[data-mode="exam"] small');
  if (examModeNote) examModeNote.textContent = "25 câu • 30 phút • chấm khi nộp bài";

  const fixedNote = document.getElementById("examFixedNote");
  if (fixedNote) fixedNote.innerHTML = '<span class="alert-icon">i</span><div><strong class="d-block mb-1">Quy định bài kiểm tra</strong>Hệ thống lấy ngẫu nhiên 25 câu từ phạm vi đã chọn; thời gian làm bài 30 phút; hết giờ hệ thống tự nộp bài.</div>';

  setText("#unansweredCount", "25");
  setText("#scoreText", "0/25 câu đúng");
})();
