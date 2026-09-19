-- Singkat nama mapel ICT di subject_teachers
update subject_teachers
set subject_name = 'ICT',
    updated_at = now()
where subject_name = 'Information & Communication Technology';
