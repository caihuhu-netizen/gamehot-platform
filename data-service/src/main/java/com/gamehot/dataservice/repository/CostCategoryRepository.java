package com.gamehot.dataservice.repository;

import com.gamehot.dataservice.model.CostCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CostCategoryRepository extends JpaRepository<CostCategory, Long> {

    @Query("SELECT c FROM CostCategory c WHERE c.deleted = 0 ORDER BY c.sortOrder ASC")
    List<CostCategory> findAllActive();

    @Modifying
    @Query("UPDATE CostCategory c SET c.deleted = 1 WHERE c.id = :id")
    void softDelete(@Param("id") Long id);
}
