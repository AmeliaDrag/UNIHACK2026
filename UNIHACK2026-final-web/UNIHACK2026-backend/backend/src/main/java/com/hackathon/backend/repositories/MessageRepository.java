package com.hackathon.backend.repositories;
import com.hackathon.backend.model.entities.MessageEntity;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
public interface MessageRepository extends JpaRepository<MessageEntity, Long> {
    // Newest first. Used for the first load; the service reverses it to oldest first.
    @EntityGraph(attributePaths = {"sender", "recipient"})
    @Query("""
            select m from MessageEntity m
            where (m.sender.id = :a and m.recipient.id = :b)
               or (m.sender.id = :b and m.recipient.id = :a)
            order by m.id desc
            """)
    List<MessageEntity> findLatestBetween(
            @Param("a") Long a, @Param("b") Long b, Pageable pageable);
    // Messages addressed to one user, newest first (first load of the unread indicator).
    @EntityGraph(attributePaths = {"sender", "recipient"})
    @Query("""
            select m from MessageEntity m
            where m.recipient.id = :me
            order by m.id desc
            """)
    List<MessageEntity> findLatestReceived(@Param("me") Long me, Pageable pageable);
    // Messages addressed to one user that are newer than afterId, oldest first.
    @EntityGraph(attributePaths = {"sender", "recipient"})
    @Query("""
            select m from MessageEntity m
            where m.recipient.id = :me and m.id > :afterId
            order by m.id asc
            """)
    List<MessageEntity> findReceivedAfter(
            @Param("me") Long me, @Param("afterId") Long afterId, Pageable pageable);
    // Oldest first, only messages newer than afterId. Used for polling.
    @EntityGraph(attributePaths = {"sender", "recipient"})
    @Query("""
            select m from MessageEntity m
            where ((m.sender.id = :a and m.recipient.id = :b)
                or (m.sender.id = :b and m.recipient.id = :a))
              and m.id > :afterId
            order by m.id asc
            """)
    List<MessageEntity> findBetweenAfter(
            @Param("a") Long a, @Param("b") Long b,
            @Param("afterId") Long afterId, Pageable pageable);
}