import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent, screen, act } from '@testing-library/react';
import ContactsForm from '../components/ContactsForm';
import ruDict from '../dictionaries/ru.json';

describe('ContactsForm Component', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('should render all form fields and submit button', () => {
    render(<ContactsForm dict={ruDict} />);

    expect(screen.getByLabelText(new RegExp(ruDict.contacts.formName, 'i'))).toBeInTheDocument();
    expect(screen.getByLabelText(new RegExp(ruDict.contacts.formPhone, 'i'))).toBeInTheDocument();
    expect(screen.getByLabelText(new RegExp(ruDict.contacts.formMessage, 'i'))).toBeInTheDocument();
    expect(screen.getByRole('button', { name: ruDict.contacts.submit })).toBeInTheDocument();
  });

  it('should simulate form submission and show success message', async () => {
    render(<ContactsForm dict={ruDict} />);

    const nameInput = screen.getByLabelText(new RegExp(ruDict.contacts.formName, 'i'));
    const contactInput = screen.getByLabelText(new RegExp(ruDict.contacts.formPhone, 'i'));
    const submitButton = screen.getByRole('button', { name: ruDict.contacts.submit });

    // Заполняем поля
    fireEvent.change(nameInput, { target: { value: 'Олег Мастер' } });
    fireEvent.change(contactInput, { target: { value: '+46700000000' } });

    // Отправляем форму
    fireEvent.click(submitButton);

    // Кнопка переходит в состояние загрузки (показывает спиннер, становится disabled)
    expect(submitButton).toBeDisabled();

    // Запускаем таймеры вперед на 1.2 секунды
    await act(async () => {
      vi.advanceTimersByTime(1200);
    });

    // Должно отобразиться сообщение об успехе
    expect(screen.getByText('Request Sent!')).toBeInTheDocument();
    expect(screen.getByText(ruDict.contacts.successMsg)).toBeInTheDocument();

    // Проверяем сброс формы
    const resetBtn = screen.getByRole('button', { name: /send another request/i });
    fireEvent.click(resetBtn);

    // Мы снова видим поля формы
    expect(screen.getByLabelText(new RegExp(ruDict.contacts.formName, 'i'))).toBeInTheDocument();
  });
});
