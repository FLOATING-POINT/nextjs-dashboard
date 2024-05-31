'use server';
import { z } from 'zod';
import {sql} from '@vercel/postgres';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { signIn } from '@/auth';
import { AuthError } from 'next-auth';


//-------------------------------------------------------------------------------------------------------

const FormSchema = z.object({
    id: z.string(),
    customerId: z.string({
      invalid_type_error: 'Please select a customer.',
    }),
    amount: z.coerce
      .number()
      .gt(0, { message: 'Please enter an amount greater than $0.' }),
    status: z.enum(['pending', 'paid'],{
      invalid_type_error: 'Please select an invoice status.',
    }),
    date: z.string(),
  });
  export type State = {
    errors?: {
      customerId?: string[];
      amount?: string[];
      status?: string[];
    };
    message?: string | null;
  }; 
const CreateInvoice = FormSchema.omit({ id: true, date: true });
export async function createInvoice(prevState: State, formData: FormData) {
  const validatedFields = CreateInvoice.safeParse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });
  // If form validation fails, return errors early. Otherwise, continue.
  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Missing Fields. Failed to Create Invoice.',
    };
  }
 
  // Prepare data for insertion into the database
  const { customerId, amount, status } = validatedFields.data;
  const amountInCents = amount * 100;
  const date = new Date().toISOString().split('T')[0];
  try {
    await sql`
    INSERT INTO invoices (customer_id, amount, status, date)
    VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
  `;
  } catch (error) {
    return {
      message: 'Database Error: Failed to Create Invoice.',
    };
  }
 

  revalidatePath('/dashboard/invoices');
  redirect('/dashboard/invoices');
}

const UpdateInvoice = FormSchema.omit({ id: true, date: true });
export async function updateInvoice(id: string,
  prevState: State,
  formData: FormData,
) {
  const validatedFields = UpdateInvoice.safeParse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });
  // If form validation fails, return errors early. Otherwise, continue.
  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Missing Fields. Failed to Create Invoice.',
    };
  }
 
  // Prepare data for insertion into the database
  const { customerId, amount, status } = validatedFields.data;
  const amountInCents = amount * 100;
  try{
    await sql`
      UPDATE invoices
      SET customer_id = ${customerId}, amount = ${amountInCents}, status = ${status}
      WHERE id = ${id}
    `;
console.log("updateInvoice")
  } catch (error) {
    return {
      message: 'Database Error: Failed to Update Invoice.',
    };
  }
  
    revalidatePath('/dashboard/invoices');
    redirect('/dashboard/invoices');
}

export async function deleteInvoice(id: string) {
  throw new Error('Failed to Delete Invoice');

  try{    
    await sql`DELETE FROM invoices WHERE id = ${id}`;
    revalidatePath('/dashboard/invoices');

  } catch (error) {
    return {
      message: 'Database Error: Failed to Delete Invoice.',
    };
  }
}


//-------------------------------------------------------------------------------------------------------
const clientFormSchema = z.object({
  id: z.string(),
  name: z.string({
    invalid_type_error: 'Please enter a client name.',
  }),
  email: z.string()
  .email({
    message: 'Please enter a client name.',
  }),
  address: z.string({
    invalid_type_error: 'Please select an address.',
  }),

});
const CreateClient = clientFormSchema.omit({ id: true });

export type createClientState = {
  errors?: {
    name?: string[];
    email?: string[];
    address?: string[];
  };
  message?: string | null;
}; 
export async function createClient(prevState: createClientState, formData: FormData) {

    const validatedFields = CreateClient.safeParse({
      name: formData.get('name'),
      email: formData.get('email'),
      address: formData.get('address'),
    });
    // If form validation fails, return errors early. Otherwise, continue.
    if (!validatedFields.success) {
      return {
        errors: validatedFields.error.flatten().fieldErrors,
        message: 'Missing Fields. Failed to Create Client.',
      };
    }

    // Prepare data for insertion into the database
    const { name, email, address } = validatedFields.data;

    try {

      await sql`
      INSERT INTO customers (name, email, address, image_url)
      VALUES (${name}, ${email}, ${address}, '/customers/default.png')`;

      console.log("createClient success");

    } catch (error) {

      console.log("createClient error", error);

      return {
        message: 'Database Error: Failed to Create Client. SQL: ${error} ',
      };

    }

    revalidatePath('/dashboard/customers');
    redirect('/dashboard/customers');

}
export async function deleteClient(id: string) {
  throw new Error('Failed to Delete Invoice');

  try{    
    await sql`DELETE FROM customers WHERE id = ${id}`;
    revalidatePath('/dashboard/customers');

  } catch (error) {
    return {
      message: 'Database Error: Failed to Delete Customer.',
    };
  }
}

//-------------------------------------------------------------------------------------------------------
export async function authenticate(
  prevState: string | undefined,
  formData: FormData,
) {
  try {
    await signIn('credentials', formData);
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case 'CredentialsSignin':
          return 'Invalid credentials.';
        default:
          return 'Something went wrong.';
      }
    }
    throw error;
  }
}
