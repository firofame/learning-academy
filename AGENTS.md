# Learning Academy

- Design for school children revising on the day before an exam.
- Consistent evidence-based learning framework across all subjects:
  - Active retrieval practice: memory prompt first, no answers revealed.
  - Immediate feedback with specific explanations.
  - Immediate correction: "Try once more now" aids initial encoding after feedback.
  - Lagged error recheck: questions answered incorrectly or with assistance strictly require a recheck after 2+ other questions.
  - Interleaved batches: "All Portions" revision interleaves questions across subtopics/categories; single-portion revision stays sequential.
  - "Exam-Ready for Tomorrow": a question or portion is Exam-Ready once answered correctly unaided OR successfully rechecked after a 2+ question lag in the revision session.
- Follow each grade's supplied curriculum and marking rubric. Flag gaps; never invent lesson content or answers.
- Build for phones and laptops.
- Keep pronunciation/read-aloud answer-safe.
- Check exact answers locally. Use server-side `gemini-3.5-flash-lite` only for meaning-based grading.
- Keep API keys server-side; send only grading essentials, never learner names or unrelated history.
- Failed or offline grading stays visibly ungraded and retryable; never penalize the learner or double-count retries.
- Reuse existing helpers, remove obsolete code, and avoid unnecessary dependencies or abstractions.
