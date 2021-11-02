package it.peluso.balance.service;

import it.peluso.balance.model.Expense;
import it.peluso.balance.repository.ExpenseRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ExpenseService {

    @Autowired
    private ExpenseRepository expenseRepository;

    public ResponseEntity<List<Expense>> getAllExpenses(){
        return new ResponseEntity<List<Expense>>((List<Expense>) expenseRepository.findAll(), HttpStatus.OK);
    }
}
