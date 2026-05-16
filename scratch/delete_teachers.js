import { supabase } from '../server/supabase.js';

async function run() {
  const { data: teachers, error } = await supabase
    .from('teachers')
    .select('id, name')
    .or('name.eq.정승준,name.eq.권소영');

  if (error) {
    console.error('Error fetching teachers:', error);
    return;
  }

  console.log('Found teachers:', teachers);

  if (teachers.length > 0) {
    const ids = teachers.map(t => t.id);
    
    // Delete from teacher_images first
    const { error: err1 } = await supabase
      .from('teacher_images')
      .delete()
      .in('teacher_id', ids);
    
    if (err1) console.error('Error deleting teacher_images:', err1);

    // Update timetables to null out teacher_id or delete? 
    // Usually we just delete the timetables if the teacher is gone.
    const { error: err2 } = await supabase
      .from('timetables')
      .delete()
      .or(`teacher_id.in.(${ids.join(',')}),teacher_ids.cs.{${ids.join(',')}}`);
    
    if (err2) console.error('Error deleting timetables:', err2);

    // Finally delete teachers
    const { error: err3 } = await supabase
      .from('teachers')
      .delete()
      .in('id', ids);
    
    if (err3) console.error('Error deleting teachers:', err3);
    else console.log('Successfully deleted teachers');
  }
}

run();
