import { NextResponse } from 'next/server';
import { supabase } from '../../../../../lib/supabase';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase environment variables are missing in Vercel settings.' },
        { status: 500 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    if (status !== 'COMPLETED') {
      return NextResponse.json({ error: 'Invalid status update. Only PENDING to COMPLETED is allowed.' }, { status: 400 });
    }

    // Check existing task status
    const { data: existingTask, error: fetchError } = await supabase
      .from('tasks')
      .select('status')
      .eq('id', id)
      .single();

    if (fetchError || !existingTask) {
      return NextResponse.json({ error: 'Task not found or invalid Task ID' }, { status: 404 });
    }

    if (existingTask.status === 'COMPLETED') {
      return NextResponse.json({ error: 'Task is already COMPLETED and cannot be modified' }, { status: 400 });
    }

    // Update status to COMPLETED
    const { data: updatedTask, error: updateError } = await supabase
      .from('tasks')
      .update({ status: 'COMPLETED' })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Supabase PATCH error:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ task: updatedTask }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
