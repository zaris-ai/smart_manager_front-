# Trainee task review frontend

- Trainees see a delivery-note field and `ارسال برای تأیید کارشناس` on their assigned tasks.
- Submitted tasks show `در انتظار تأیید کارشناس` and cannot be closed directly by the trainee.
- Every expert who belongs to the project can see pending trainee submissions in the review queue; trainees do not load or see the expert review queue.
- Experts can approve or reject. Rejection requires feedback and permanently removes the trainee task.
- Approval moves the task into the normal completed-task flow, so it contributes to project completion exactly like other `done` tasks.
- Approval does not create a reviewer work-log entry; reviewing a trainee task is not credited as work performed by the reviewer.
- Legacy rejected records from older data may still display their historical review feedback until those records are cleaned separately.
