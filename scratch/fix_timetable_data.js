import { supabase } from '../server/supabase.js';

async function run() {
  // 1. Update 소순영 통합사회/한국사
  const { data: tt1, error: err1 } = await supabase
    .from('timetables')
    .select('id, class_name')
    .ilike('class_name', '%소순영 통합사회/한국사%')
    .single();

  if (err1) {
    console.error('Error finding tt1:', err1);
  } else {
    console.log('Found tt1:', tt1);
    const newName = tt1.class_name.includes(')') 
      ? tt1.class_name.replace(')', '/수원)') 
      : tt1.class_name + ' (수원)';
    
    const { error: updateErr1 } = await supabase
      .from('timetables')
      .update({ class_name: newName })
      .eq('id', tt1.id);
    
    if (updateErr1) console.error('Error updating tt1:', updateErr1);
    else console.log('Successfully updated tt1 name to:', newName);
  }

  // 2. Update 가온고1 통합사회/한국사 내신반
  const { data: tt2, error: err2 } = await supabase
    .from('timetables')
    .select('id, start_date')
    .ilike('class_name', '%가온고1 통합사회/한국사%')
    .single();

  if (err2) {
    console.error('Error finding tt2:', err2);
  } else {
    console.log('Found tt2:', tt2);
    const { error: updateErr2 } = await supabase
      .from('timetables')
      .update({ start_date: '5/23' })
      .eq('id', tt2.id);
    
    if (updateErr2) console.error('Error updating tt2:', updateErr2);
    else console.log('Successfully updated tt2 start_date to 5/23');
  }
}

run();
