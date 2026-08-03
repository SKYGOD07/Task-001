import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';

export async function GET() {
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase environment variables are missing in Vercel. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel settings.' },
        { status: 500 }
      );
    }

    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase GET error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ tasks: tasks || [] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase environment variables are missing in Vercel. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel settings.' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { employee_name, task_name, priority } = body;

    // Validation
    if (!employee_name || typeof employee_name !== 'string' || employee_name.trim() === '') {
      return NextResponse.json({ error: 'Employee Name is required and cannot be empty' }, { status: 400 });
    }
    if (!task_name || typeof task_name !== 'string' || task_name.trim() === '') {
      return NextResponse.json({ error: 'Task Name is required and cannot be empty' }, { status: 400 });
    }
    if (!['LOW', 'MEDIUM', 'HIGH'].includes(priority)) {
      return NextResponse.json({ error: 'Invalid Priority. Must be LOW, MEDIUM, or HIGH' }, { status: 400 });
    }

    // Auto-generate Employee ID
    const { data: latestTasks, error: fetchError } = await supabase
      .from('tasks')
      .select('employee_id')
      .order('created_at', { ascending: false })
      .limit(1);

    if (fetchError) {
      console.error('Error fetching latest task:', fetchError);
      return NextResponse.json({ error: 'Failed to generate Employee ID: ' + fetchError.message }, { status: 500 });
    }

    let nextEmpIdNumber = 1;
    if (latestTasks && latestTasks.length > 0) {
      const latestEmpId = latestTasks[0].employee_id;
      const match = latestEmpId.match(/EMP(\d+)/);
      if (match && match[1]) {
        nextEmpIdNumber = parseInt(match[1], 10) + 1;
      } else {
        nextEmpIdNumber = Math.floor(Math.random() * 1000) + 1;
      }
    }
    const generatedEmployeeId = `EMP${nextEmpIdNumber.toString().padStart(3, '0')}`;

    // Insert task
    const { data, error } = await supabase
      .from('tasks')
      .insert([
        {
          employee_id: generatedEmployeeId,
          employee_name: employee_name.trim(),
          task_name: task_name.trim(),
          priority,
          status: 'PENDING',
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Supabase POST error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ task: data }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
