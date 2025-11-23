// page.js ou BookClubTracker.js
'use client';

import React, { useEffect, useState } from 'react';
import {
  Star,
  BookOpen,
  Users,
  Sparkles,
  Plus,
  Trash2,
  Edit2,
  CheckCircle,
  Clock,
  Upload,
  Quote,
  Heart
} from 'lucide-react';
import { supabase } from '../lib/supabase';


export default function BookClubTracker() {
  // -----------------------------
  // State principal
  // -----------------------------
  const [books, setBooks] = useState([]);
  const [members, setMembers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedBook, setSelectedBook] = useState(null);
  const [selectedMember, setSelectedMember] = useState(null);

  const [showAddBook, setShowAddBook] = useState(false);
  const [showAddReview, setShowAddReview] = useState(false);
  const [showAddQuote, setShowAddQuote] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [editingBook, setEditingBook] = useState(null);

  // Onglets : toRead | reading | read | bookitheque
  const [activeTab, setActiveTab] = useState('toRead');

  // Upload image
  const [coverImageFile, setCoverImageFile] = useState(null);
  const [coverImagePreview, setCoverImagePreview] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // New book form
  const [newBook, setNewBook] = useState({
    title: '',
    author: '',
    pages: '',
    price: '',
    summary: '',
    status: 'toRead', // ou 'reading' | 'read' | 'bookitheque'
    startDate: '',
    endDate: '',
    suggestedBy: '',
    year: '',
    genres: [],
    loanStatus: 'notAvailable', // notAvailable | shareable | borrowed
    loanTo: '',
    isFavorite: false
  });

  // New review
  const [newReview, setNewReview] = useState({
    member: '',
    writing: 0,
    plot: 0,
    characters: 0,
    impact: 0,
    readingTime: '',
    comment: ''
  });

  // New quote
  const [newQuote, setNewQuote] = useState({ member: '', text: '' });

  // New member
  const [newMemberName, setNewMemberName] = useState('');

  // Inputs pour les genres (tags)
  const [newGenreInput, setNewGenreInput] = useState('');
  const [editGenreInput, setEditGenreInput] = useState('');

  // -----------------------------
  // Helpers
  // -----------------------------
  const addGenreToList = (currentList, value) => {
    const trimmed = value.trim();
    if (!trimmed) return currentList;
    if (currentList.includes(trimmed)) return currentList;
    return [...currentList, trimmed];
  };

  // -----------------------------
  // Chargement initial
  // -----------------------------
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const { data: booksData, error: booksError } = await supabase
        .from('books')
        .select('*, reviews(*), quotes(*)')
        .order('created_at', { ascending: false });

      if (booksError) throw booksError;

      const transformedBooks = (booksData || []).map((b) => ({
        id: b.id,
        title: b.title,
        author: b.author,
        pages: b.pages || 0,
        price: b.price || '',
        summary: b.summary || '',
        coverUrl: b.cover_url || '',
        status: b.status || 'toRead',
        startDate: b.start_date || null,
        endDate: b.end_date || null,
        suggestedBy: b.suggested_by || '',
        year: b.year || '',
        genres: b.genres || [],
        reviews: b.reviews || [],
        quotes: b.quotes || [],
        loanStatus: b.loan_status || 'notAvailable',
        loanTo: b.loan_to || null,
        isFavorite: !!b.is_favorite
      }));

      setBooks(transformedBooks);

      const { data: membersData, error: membersError } = await supabase
        .from('members')
        .select('*')
        .order('created_at', { ascending: true });

      if (membersError) throw membersError;
      setMembers(membersData || []);
    } catch (err) {
      console.error('Erreur loadData:', err);
      alert('Impossible de charger les données (voir console).');
    } finally {
      setIsLoading(false);
    }
  };

  // -----------------------------
  // Helpers image de couverture
  // -----------------------------
  const handleCoverImageChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) {
      alert("L'image est trop lourde (max 5MB).");
      return;
    }
    setCoverImageFile(f);
    const reader = new FileReader();
    reader.onload = () => setCoverImagePreview(reader.result);
    reader.readAsDataURL(f);
  };

  const uploadCoverImageToStorage = async (file) => {
    if (!file) return null;
    try {
      const ext = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).slice(2)}-${Date.now()}.${ext}`;
      const path = fileName;
      const { error: uploadError } = await supabase.storage
        .from('covers')
        .upload(path, file);
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('covers').getPublicUrl(path);
      return data?.publicUrl || null;
    } catch (err) {
      console.error('uploadCoverImageToStorage error', err);
      throw err;
    }
  };

  // -----------------------------
  // CRUD livres
  // -----------------------------
  const resetNewBookForm = () => {
    setNewBook({
      title: '',
      author: '',
      pages: '',
      price: '',
      summary: '',
      status: 'toRead',
      startDate: '',
      endDate: '',
      suggestedBy: '',
      year: '',
      genres: [],
      loanStatus: 'notAvailable',
      loanTo: '',
      isFavorite: false
    });
    setCoverImageFile(null);
    setCoverImagePreview('');
    setNewGenreInput('');
  };

  const addBook = async () => {
    if (!newBook.title || !newBook.author) {
      alert('Titre et auteur requis.');
      return;
    }

    setIsUploading(true);
    try {
      let coverUrl = '';
      if (coverImageFile) {
        coverUrl = await uploadCoverImageToStorage(coverImageFile);
      }

      const insertObj = {
        title: newBook.title,
        author: newBook.author,
        pages: parseInt(newBook.pages) || 0,
        price: newBook.price || null,
        summary: newBook.summary || null,
        cover_url: coverUrl || null,
        status: newBook.status,
        start_date: newBook.startDate || null,
        end_date: newBook.endDate || null,
        suggested_by: newBook.suggestedBy || null,
        year: newBook.year || null,
        genres: newBook.genres || [],
        loan_status: newBook.loanStatus || 'notAvailable',
        loan_to: newBook.loanTo || null,
        is_favorite: newBook.isFavorite || false
      };

      const { data, error } = await supabase
        .from('books')
        .insert([insertObj])
        .select('*, reviews(*), quotes(*)')
        .single();

      if (error) throw error;

      const b = {
        id: data.id,
        title: data.title,
        author: data.author,
        pages: data.pages || 0,
        price: data.price || '',
        summary: data.summary || '',
        coverUrl: data.cover_url || '',
        status: data.status || 'toRead',
        startDate: data.start_date || null,
        endDate: data.end_date || null,
        suggestedBy: data.suggested_by || '',
        year: data.year || '',
        genres: data.genres || [],
        reviews: data.reviews || [],
        quotes: data.quotes || [],
        loanStatus: data.loan_status || 'notAvailable',
        loanTo: data.loan_to || null,
        isFavorite: !!data.is_favorite
      };

      setBooks((prev) => [b, ...prev]);
      resetNewBookForm();
      setShowAddBook(false);
    } catch (err) {
      console.error('addBook error', err);
      alert("Erreur lors de l'ajout du livre.");
    } finally {
      setIsUploading(false);
    }
  };

  const deleteBook = async (bookId) => {
    if (!confirm('Supprimer ce livre ? Cette action est irréversible.')) return;

    try {
      const book = books.find((b) => b.id === bookId);

      // suppression best-effort de la cover
      if (book?.coverUrl) {
        try {
          const fileName = book.coverUrl.split('/').pop();
          await supabase.storage.from('covers').remove([fileName]);
        } catch (err) {
          console.warn('remove cover error', err);
        }
      }

      const { error } = await supabase.from('books').delete().eq('id', bookId);
      if (error) throw error;

      setBooks((prev) => prev.filter((b) => b.id !== bookId));
      if (selectedBook?.id === bookId) setSelectedBook(null);
    } catch (err) {
      console.error('deleteBook error', err);
      alert('Impossible de supprimer le livre.');
    }
  };

  const updateBook = async () => {
    if (!editingBook) return;

    try {
      const { error } = await supabase
        .from('books')
        .update({
          title: editingBook.title,
          author: editingBook.author,
          pages: parseInt(editingBook.pages) || 0,
          price: editingBook.price || null,
          summary: editingBook.summary || null,
          status: editingBook.status || 'toRead',
          start_date: editingBook.startDate || null,
          end_date: editingBook.endDate || null,
          suggested_by: editingBook.suggestedBy || null,
          year: editingBook.year || null,
          genres: editingBook.genres || [],
          loan_status: editingBook.loanStatus || 'notAvailable',
          loan_to: editingBook.loanTo || null,
          is_favorite: editingBook.isFavorite || false
        })
        .eq('id', editingBook.id);

      if (error) throw error;

      setBooks((prev) =>
        prev.map((b) => (b.id === editingBook.id ? { ...b, ...editingBook } : b))
      );
      if (selectedBook?.id === editingBook.id) setSelectedBook(editingBook);
      setEditingBook(null);
    } catch (err) {
      console.error('updateBook error', err);
      alert('Impossible de modifier le livre.');
    }
  };

  const toggleBookStatus = async (bookId) => {
    const book = books.find((b) => b.id === bookId);
    if (!book) return;

    let newStatus;
    if (book.status === 'toRead') newStatus = 'reading';
    else if (book.status === 'reading') newStatus = 'read';
    else if (book.status === 'read') newStatus = 'bookitheque';
    else newStatus = 'toRead';

    try {
      const { error } = await supabase
        .from('books')
        .update({ status: newStatus })
        .eq('id', bookId);
      if (error) throw error;

      setBooks((prev) =>
        prev.map((b) => (b.id === bookId ? { ...b, status: newStatus } : b))
      );
      if (selectedBook?.id === bookId) {
        setSelectedBook((prev) => (prev ? { ...prev, status: newStatus } : prev));
      }
    } catch (err) {
      console.error('toggleBookStatus error', err);
    }
  };

  // Coup de cœur
  const toggleFavorite = async (bookId) => {
    const book = books.find((b) => b.id === bookId);
    if (!book) return;

    const newValue = !book.isFavorite;

    try {
      const { error } = await supabase
        .from('books')
        .update({ is_favorite: newValue })
        .eq('id', bookId);
      if (error) throw error;

      setBooks((prev) =>
        prev.map((b) => (b.id === bookId ? { ...b, isFavorite: newValue } : b))
      );
      if (selectedBook?.id === bookId) {
        setSelectedBook((prev) =>
          prev ? { ...prev, isFavorite: newValue } : prev
        );
      }
    } catch (err) {
      console.error('toggleFavorite error', err);
      alert('Impossible de mettre à jour le coup de cœur.');
    }
  };

  // Prêt
  const updateLoanStatus = async (book, value) => {
    if (!book) return;

    let loanStatus = 'notAvailable';
    let loanTo = null;

    if (value === 'notAvailable') {
      loanStatus = 'notAvailable';
    } else if (value === 'shareable') {
      loanStatus = 'shareable';
    } else if (value.startsWith('borrowed:')) {
      loanStatus = 'borrowed';
      loanTo = value.slice('borrowed:'.length);
    }

    try {
      const { error } = await supabase
        .from('books')
        .update({
          loan_status: loanStatus,
          loan_to: loanTo
        })
        .eq('id', book.id);

      if (error) throw error;

      setBooks((prev) =>
        prev.map((b) =>
          b.id === book.id ? { ...b, loanStatus, loanTo } : b
        )
      );
      setSelectedBook((prev) =>
        prev && prev.id === book.id ? { ...prev, loanStatus, loanTo } : prev
      );
    } catch (err) {
      console.error('updateLoanStatus error', err);
      alert('Impossible de mettre à jour le statut de prêt.');
    }
  };

  // -----------------------------
  // Avis (reviews)
  // -----------------------------
  const addReview = async () => {
    if (!selectedBook) return;
    if (
      !newReview.member ||
      newReview.writing +
        newReview.plot +
        newReview.characters +
        newReview.impact ===
        0
    ) {
      alert('Sélectionnez un membre et notez au moins une catégorie.');
      return;
    }

    const average = (
      (newReview.writing +
        newReview.plot +
        newReview.characters +
        newReview.impact) /
      4
    ).toFixed(1);

    try {
      const payload = {
        book_id: selectedBook.id,
        member: newReview.member,
        rating: parseFloat(average),
        writing: newReview.writing,
        plot: newReview.plot,
        characters: newReview.characters,
        impact: newReview.impact,
        reading_time: newReview.readingTime || null,
        comment: newReview.comment || null
      };

      const { data, error } = await supabase
        .from('reviews')
        .insert([payload])
        .select()
        .single();

      if (error) throw error;

      const updatedBook = {
        ...selectedBook,
        reviews: [...(selectedBook.reviews || []), data]
      };

      setBooks((prev) =>
        prev.map((b) => (b.id === selectedBook.id ? updatedBook : b))
      );
      setSelectedBook(updatedBook);

      setNewReview({
        member: '',
        writing: 0,
        plot: 0,
        characters: 0,
        impact: 0,
        readingTime: '',
        comment: ''
      });
      setShowAddReview(false);
    } catch (err) {
      console.error('addReview error', err);
      alert("Impossible d'ajouter l'avis.");
    }
  };

  const deleteReview = async (reviewId) => {
    if (!confirm('Supprimer cet avis ?')) return;

    try {
      const { error } = await supabase
        .from('reviews')
        .delete()
        .eq('id', reviewId);
      if (error) throw error;

      setBooks((prev) =>
        prev.map((b) =>
          b.reviews
            ? { ...b, reviews: b.reviews.filter((r) => r.id !== reviewId) }
            : b
        )
      );

      if (selectedBook) {
        setSelectedBook((prev) =>
          prev
            ? {
                ...prev,
                reviews: prev.reviews.filter((r) => r.id !== reviewId)
              }
            : prev
        );
      }
    } catch (err) {
      console.error('deleteReview error', err);
      alert("Impossible de supprimer l'avis.");
    }
  };

  // -----------------------------
  // Citations
  // -----------------------------
  const addQuote = async () => {
    if (!selectedBook) return;
    if (!newQuote.member || !newQuote.text.trim()) {
      alert('Membre et texte requis.');
      return;
    }

    try {
      const payload = {
        book_id: selectedBook.id,
        member: newQuote.member,
        text: newQuote.text.trim()
      };

      const { data, error } = await supabase
        .from('quotes')
        .insert([payload])
        .select()
        .single();

      if (error) throw error;

      const updatedBook = {
        ...selectedBook,
        quotes: [...(selectedBook.quotes || []), data]
      };

      setBooks((prev) =>
        prev.map((b) => (b.id === selectedBook.id ? updatedBook : b))
      );
      setSelectedBook(updatedBook);
      setNewQuote({ member: '', text: '' });
      setShowAddQuote(false);
    } catch (err) {
      console.error('addQuote error', err);
      alert("Impossible d'ajouter la citation.");
    }
  };

  const deleteQuote = async (quoteId) => {
    if (!confirm('Supprimer cette citation ?')) return;

    try {
      const { error } = await supabase
        .from('quotes')
        .delete()
        .eq('id', quoteId);
      if (error) throw error;

      setBooks((prev) =>
        prev.map((b) =>
          b.quotes
            ? { ...b, quotes: b.quotes.filter((q) => q.id !== quoteId) }
            : b
        )
      );

      if (selectedBook) {
        setSelectedBook((prev) =>
          prev
            ? {
                ...prev,
                quotes: prev.quotes.filter((q) => q.id !== quoteId)
              }
            : prev
        );
      }
    } catch (err) {
      console.error('deleteQuote error', err);
      alert('Impossible de supprimer la citation.');
    }
  };

  // -----------------------------
  // Membres
  // -----------------------------
  const addMember = async () => {
    if (!newMemberName.trim()) return;
    try {
      const { data, error } = await supabase
        .from('members')
        .insert([{ name: newMemberName.trim() }])
        .select()
        .single();
      if (error) throw error;
      setMembers((prev) => [...prev, data]);
      setShowAddMember(false);
      setNewMemberName('');
    } catch (err) {
      console.error('addMember error', err);
      alert("Impossible d'ajouter le membre.");
    }
  };

  const deleteMember = async (memberId) => {
    if (!confirm('Supprimer ce membre ?')) return;
    try {
      const { error } = await supabase
        .from('members')
        .delete()
        .eq('id', memberId);
      if (error) throw error;
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
      if (selectedMember?.id === memberId) setSelectedMember(null);
    } catch (err) {
      console.error('deleteMember error', err);
      alert('Impossible de supprimer le membre.');
    }
  };

  // -----------------------------
  // Utils & listes dérivées
  // -----------------------------
  const toReadBooks = books.filter((b) => b.status === 'toRead');
  const readingBooks = books.filter((b) => b.status === 'reading');
  const readBooks = books.filter((b) => b.status === 'read');
  const bookithequeBooks = books.filter((b) => b.status === 'bookitheque');

  const displayBooks =
    activeTab === 'toRead'
      ? toReadBooks
      : activeTab === 'reading'
      ? readingBooks
      : activeTab === 'read'
      ? readBooks
      : bookithequeBooks;

  const drawRandomBook = () => {
    if (toReadBooks.length === 0) {
      alert('Aucun livre à lire pour le moment.');
      return;
    }
    const r =
      toReadBooks[Math.floor(Math.random() * toReadBooks.length)];
    setSelectedBook(r);
    setActiveTab('toRead');
    setSelectedMember(null);
  };

  const getMemberActivity = (memberName) => {
    const suggestedBooksAll = books.filter(
      (b) => b.suggestedBy === memberName
    );

    const bookithequeBooksForMember = suggestedBooksAll.filter(
      (b) => b.status === 'bookitheque'
    );
    const suggestedBooks = suggestedBooksAll.filter(
      (b) => b.status !== 'bookitheque'
    );

    const reviews = books.flatMap((b) =>
      (b.reviews || [])
        .filter((r) => r.member === memberName)
        .map((r) => ({ ...r, bookTitle: b.title, bookId: b.id }))
    );
    const quotes = books.flatMap((b) =>
      (b.quotes || [])
        .filter((q) => q.member === memberName)
        .map((q) => ({ ...q, bookTitle: b.title, bookId: b.id }))
    );
    return { suggestedBooks, bookithequeBooksForMember, reviews, quotes };
  };

  const formatDate = (d) => {
    if (!d) return '';
    try {
      return new Date(d).toLocaleDateString('fr-FR');
    } catch {
      return d;
    }
  };

  // -----------------------------
  // Notation étoiles
  // -----------------------------
  const StarRating = ({ rating, onRate, readonly = false }) => {
    const max = 10;
    return (
      <div className="flex gap-1">
        {Array.from({ length: max }).map((_, idx) => {
          const val = idx + 1;
          return (
            <Star
              key={val}
              size={18}
              className={`${
                rating >= val
                  ? 'fill-pink-400 text-pink-400'
                  : 'text-gray-300'
              } ${
                !readonly
                  ? 'cursor-pointer hover:fill-pink-300 hover:text-pink-300'
                  : ''
              }`}
              onClick={() => !readonly && onRate(val)}
            />
          );
        })}
      </div>
    );
  };

  // -----------------------------
  // Render
  // -----------------------------
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-pink-100 via-amber-100 to-sky-100">
        <div className="text-center">
          <BookOpen
            size={64}
            className="text-pink-500 animate-pulse mx-auto mb-4"
          />
          <p className="text-xl text-gray-600">Chargement…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-pink-100 via-amber-100 to-sky-100 p-6 overflow-hidden">
      {/* Petits livres qui volent */}
      <BookOpen
        size={40}
        className="hidden sm:block text-pink-200 absolute -top-4 left-10 -rotate-12 animate-bounce"
      />
      <BookOpen
        size={32}
        className="hidden sm:block text-amber-200 absolute top-24 right-10 rotate-12 animate-pulse"
      />
      <BookOpen
        size={36}
        className="hidden sm:block text-sky-200 absolute bottom-10 left-6 rotate-6 animate-bounce"
      />

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <div className="bg-white/90 backdrop-blur rounded-3xl shadow-lg p-8 mb-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              {/* Avatar du club : mets ton image dans /public/club-avatar.png.jpg */}
              <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-md bg-pink-100 flex items-center justify-center">
                <img
                  src="/club-avatar.png.jpg"
                  alt="Logo du club de lecture"
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">
                  Club de lecture
                </h1>
                <p className="text-sm text-gray-600">
                  Suivi des lectures, recommandations & coups de cœur
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={drawRandomBook}
                className="bg-white border border-pink-200 text-pink-600 px-6 py-3 rounded-xl font-semibold flex items-center gap-2 hover:shadow-md hover:bg-pink-50 transition-all"
              >
                <Sparkles size={20} />
                Tirage au sort
              </button>

              <button
                onClick={() => setShowAddBook(true)}
                className="bg-gradient-to-r from-pink-400 to-purple-500 text-white px-6 py-3 rounded-xl font-semibold flex items-center gap-2 hover:shadow-lg transform hover:scale-105 transition-all"
              >
                <Plus size={20} />
                Ajouter un livre
              </button>

              <button
                onClick={() => {
                  setActiveTab('bookitheque');
                  setSelectedMember(null);
                }}
                className={`px-6 py-3 rounded-xl font-semibold flex items-center gap-2 border transition-all ${
                  activeTab === 'bookitheque'
      ? "bg-gradient-to-r from-amber-200 to-yellow-300 text-gray-800 shadow-md"
      : "bg-amber-100 text-gray-700 border border-amber-200 hover:bg-amber-200"
                }`}
              >
                📚 Bookithèque
              </button>
            </div>
          </div>
        </div>

        {/* Membres */}
        <div className="bg-white/90 backdrop-blur rounded-3xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-blue-400 to-purple-500 p-3 rounded-xl">
                <Users className="text-white" size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-800">Membres</h2>
                <p className="text-sm text-gray-600">
                  {members.length} membre
                  {members.length > 1 ? 's' : ''}
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowAddMember(true)}
              className="bg-gradient-to-r from-blue-400 to-purple-500 text-white px-5 py-2 rounded-xl font-semibold flex items-center gap-2 hover:shadow-lg"
            >
              <Plus size={18} />
              Ajouter
            </button>
          </div>

          <div className="flex flex-wrap gap-3">
            {members.map((m) => (
              <div
                key={m.id}
                onClick={() => {
                  setSelectedMember(m);
                  setSelectedBook(null);
                }}
                className="px-4 py-2 rounded-xl flex items-center gap-2 group cursor-pointer bg-gradient-to-r from-blue-50 to-purple-50 hover:shadow-md"
              >
                <span className="font-semibold text-gray-800">
                  {m.name}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteMember(m.id);
                  }}
                  className="p-1 rounded-lg opacity-0 group-hover:opacity-100 text-red-500 hover:bg-red-100"
                  title="Supprimer membre"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            {members.length === 0 && (
              <p className="text-gray-400 text-sm">Aucun membre</p>
            )}
          </div>
        </div>

        {/* Grille principale */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Colonne liste */}
          <div className="bg-white/90 backdrop-blur rounded-3xl shadow-lg p-6">
            {/* Tabs */}
            <div className="flex gap-2 mb-4">
              {[
                {
                  key: 'toRead',
                  icon: Clock,
                  label: 'À lire',
                  count: toReadBooks.length,
                  color: 'from-orange-400 to-pink-400'
                },
                {
                  key: 'reading',
                  icon: BookOpen,
                  label: 'En cours',
                  count: readingBooks.length,
                  color: 'from-blue-400 to-purple-400'
                },
                {
                  key: 'read',
                  icon: CheckCircle,
                  label: 'Lus',
                  count: readBooks.length,
                  color: 'from-green-400 to-teal-400'
                },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => {
                    setActiveTab(tab.key);
                    setSelectedMember(null);
                  }}
                  className={`flex-1 py-3 px-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${
                    activeTab === tab.key && !selectedMember
                      ? `bg-gradient-to-r ${tab.color} text-white shadow-md`
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <tab.icon size={18} />
                  <span className="hidden sm:inline">{tab.label}</span> (
                  {tab.count})
                </button>
              ))}
            </div>

            {/* Liste des livres */}
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {displayBooks.map((book) => {
                const avgRating =
                  book.reviews && book.reviews.length > 0
                    ? (
                        book.reviews.reduce(
                          (acc, r) => acc + (r.rating || 0),
                          0
                        ) / book.reviews.length
                      ).toFixed(1)
                    : null;

                return (
                  <div
                    key={book.id}
                    onClick={() => {
                      setSelectedBook(book);
                      setSelectedMember(null);
                    }}
                    className={`p-4 rounded-2xl cursor-pointer transition-all ${
                      selectedBook?.id === book.id
                        ? 'bg-gradient-to-r from-pink-100 to-purple-100 shadow-md'
                        : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex gap-4">
                      {/* Cover */}
                      {book.coverUrl ? (
                        <img
                          src={book.coverUrl}
                          alt={book.title}
                          className="w-16 h-24 object-cover rounded-lg shadow-md"
                        />
                      ) : (
                        <div className="w-16 h-24 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">
                          <BookOpen />
                        </div>
                      )}

                      {/* Infos */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-gray-800 truncate">
                          {book.title}
                        </h3>
                        <p className="text-sm text-gray-600 truncate">
                          {book.author}
                        </p>

                        {book.suggestedBy && (
                          <p className="text-xs text-purple-600 mt-1">
                            Suggéré par {book.suggestedBy}
                          </p>
                        )}

                        {/* Ligne 1 : pages / prix / année */}
                        <div className="flex flex-wrap gap-2 mt-2 text-xs text-gray-500">
                          <span>📄 {book.pages}p</span>
                          {book.price && <span>💶 {book.price}</span>}
                          {book.year && <span>📅 {book.year}</span>}
                        </div>

                        {/* Genres */}
                        {book.genres?.length > 0 && (
                          <div className="flex flex-wrap mt-1 text-xs text-gray-500 gap-1">
                            {book.genres.map((g, i) => (
                              <span
                                key={i}
                                className="px-2 py-0.5 bg-white rounded-full border border-pink-100 text-pink-600"
                              >
                                {g}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Note moyenne */}
                        {avgRating && (
                          <div className="flex items-center gap-2 mt-2">
                            <Star
                              size={14}
                              className="fill-pink-400 text-pink-400"
                            />
                            <span className="text-sm font-semibold text-pink-600">
                              {avgRating}/10
                            </span>
                            <span className="text-xs text-gray-400">
                              ({book.reviews.length} avis)
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col gap-2 items-end">
                        {/* Coup de cœur */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(book.id);
                          }}
                          className="p-2 rounded-lg hover:bg-pink-100"
                          title="Coup de cœur"
                        >
                          <Heart
                            size={18}
                            className={
                              book.isFavorite
                                ? 'fill-red-500 text-red-500'
                                : 'text-gray-300'
                            }
                          />
                        </button>

                        {/* Statut de lecture */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleBookStatus(book.id);
                          }}
                          className={`p-2 rounded-lg ${
                            book.status === 'read'
                              ? 'bg-green-100 text-green-600'
                              : book.status === 'reading'
                              ? 'bg-blue-100 text-blue-600'
                              : book.status === 'toRead'
                              ? 'bg-orange-100 text-orange-600'
                              : 'bg-purple-100 text-purple-600'
                          }`}
                          title="Changer le statut"
                        >
                          {book.status === 'read' ? (
                            <CheckCircle size={16} />
                          ) : book.status === 'reading' ? (
                            <BookOpen size={16} />
                          ) : book.status === 'toRead' ? (
                            <Clock size={16} />
                          ) : (
                            <Sparkles size={16} />
                          )}
                        </button>

                        {/* Edit */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingBook(book);
                          }}
                          className="p-2 rounded-lg bg-blue-100 text-blue-600"
                          title="Modifier"
                        >
                          <Edit2 size={16} />
                        </button>

                        {/* Delete */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteBook(book.id);
                          }}
                          className="p-2 rounded-lg bg-red-100 text-red-600"
                          title="Supprimer"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {displayBooks.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  <BookOpen
                    size={48}
                    className="mx-auto mb-3 opacity-50"
                  />
                  <p>Aucun livre</p>
                </div>
              )}
            </div>
          </div>

          {/* Colonne détail */}
          <div className="bg-white/90 backdrop-blur rounded-3xl shadow-lg p-6">
            {selectedMember ? (
              // Vue d'un membre
              <div>
                <h2 className="text-2xl font-bold mb-1">
                  {selectedMember.name}
                </h2>
                <p className="text-sm text-gray-500 mb-4">
                  Activité dans le club
                </p>

                <div className="space-y-6 max-h-[600px] overflow-y-auto">
                  {(() => {
                    const activity = getMemberActivity(selectedMember.name);
                    const {
                      bookithequeBooksForMember,
                      suggestedBooks,
                      reviews,
                      quotes
                    } = activity;

                    return (
                      <>
                        {/* Livres de la Bookithèque */}
                        <div>
                          <h3 className="font-bold text-lg mb-3">
                            Livres de la Bookithèque (
                            {bookithequeBooksForMember.length})
                          </h3>
                          <div className="space-y-2">
                            {bookithequeBooksForMember.map((b) => (
                              <div
                                key={b.id}
                                className="p-3 rounded-xl bg-purple-50 flex justify-between items-center cursor-pointer"
                                onClick={() => {
                                  setSelectedBook(b);
                                  setSelectedMember(null);
                                }}
                              >
                                <div>
                                  <p className="font-semibold text-gray-800">
                                    {b.title}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {b.author}
                                  </p>
                                </div>
                                <span className="text-xs text-purple-600 font-semibold">
                                  Bookithèque
                                </span>
                              </div>
                            ))}
                            {bookithequeBooksForMember.length === 0 && (
                              <p className="text-gray-400 text-sm">
                                Aucun livre en Bookithèque pour ce membre
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Livres suggérés */}
                        <div>
                          <h3 className="font-bold text-lg mb-3">
                            Livres suggérés ({suggestedBooks.length})
                          </h3>
                          <div className="space-y-2">
                            {suggestedBooks.map((b) => (
                              <div
                                key={b.id}
                                className="p-3 rounded-xl bg-yellow-50 flex justify-between items-center cursor-pointer"
                                onClick={() => {
                                  setSelectedBook(b);
                                  setSelectedMember(null);
                                }}
                              >
                                <div>
                                  <p className="font-semibold text-gray-800">
                                    {b.title}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {b.author}
                                  </p>
                                </div>
                                <span className="text-xs text-gray-500">
                                  {b.status === 'read'
                                    ? 'Lu'
                                    : b.status === 'reading'
                                    ? 'En cours'
                                    : 'À lire'}
                                </span>
                              </div>
                            ))}
                            {suggestedBooks.length === 0 && (
                              <p className="text-gray-400 text-sm">
                                Aucun autre livre suggéré
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Avis */}
                        <div>
                          <h3 className="font-bold text-lg mb-3">
                            Avis ({reviews.length})
                          </h3>
                          {reviews.map((r) => (
                            <div
                              key={r.id}
                              className="bg-pink-50 p-4 rounded-2xl mb-2"
                            >
                              <div className="flex justify-between items-start mb-3">
                                <div>
                                  <p className="font-bold">
                                    {r.bookTitle}
                                  </p>
                                  <p className="text-xs text-gray-600 mt-1">
                                    {r.comment}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-pink-600">
                                      {r.rating}/10
                                    </span>
                                    <button
                                      onClick={() => deleteReview(r.id)}
                                      title="Supprimer avis"
                                      className="text-red-500"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                          {reviews.length === 0 && (
                            <p className="text-gray-400 text-sm">
                              Aucun avis
                            </p>
                          )}
                        </div>

                        {/* Citations */}
                        <div>
                          <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                            <Quote
                              size={20}
                              className="text-purple-500"
                            />
                            Citations ({quotes.length})
                          </h3>
                          {quotes.map((q) => (
                            <div
                              key={q.id}
                              className="bg-purple-50 p-4 rounded-2xl mb-2"
                            >
                              <div className="flex justify-between">
                                <div>
                                  <p className="font-bold text-gray-800 mb-1">
                                    {q.bookTitle}
                                  </p>
                                  <p className="text-sm italic text-gray-700">
                                    {q.text}
                                  </p>
                                </div>
                                <div className="flex items-start gap-2">
                                  <button
                                    onClick={() => {
                                      const b = books.find(
                                        (b2) => b2.id === q.bookId
                                      );
                                      if (b) {
                                        setSelectedBook(b);
                                        setSelectedMember(null);
                                      }
                                    }}
                                    className="text-blue-600"
                                  >
                                    Voir
                                  </button>
                                  <button
                                    onClick={() => deleteQuote(q.id)}
                                    title="Supprimer citation"
                                    className="text-red-500"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                          {quotes.length === 0 && (
                            <p className="text-gray-400 text-sm">
                              Aucune citation
                            </p>
                          )}
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            ) : selectedBook ? (
              // Vue d'un livre
              <div>
                {/* Cover */}
                {selectedBook.coverUrl && (
                  <div className="flex justify-center mb-6">
                    <img
                      src={selectedBook.coverUrl}
                      alt={selectedBook.title}
                      className="w-48 h-72 object-cover rounded-xl shadow-lg"
                    />
                  </div>
                )}

                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-2xl font-bold text-gray-800">
                    {selectedBook.title}
                  </h2>
                  <button
                    onClick={() => toggleFavorite(selectedBook.id)}
                    className="p-2 rounded-full hover:bg-pink-100"
                    title="Coup de cœur"
                  >
                    <Heart
                      size={22}
                      className={
                        selectedBook.isFavorite
                          ? 'fill-red-500 text-red-500'
                          : 'text-gray-300'
                      }
                    />
                  </button>
                </div>

                <p className="text-center text-gray-600 mb-4">
                  {selectedBook.author}
                </p>

                <div className="space-y-4 max-h-[500px] overflow-y-auto">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-blue-50 p-4 rounded-2xl">
                      <p className="text-sm text-gray-600 mb-1">
                        📄 Pages
                      </p>
                      <p className="font-semibold">
                        {selectedBook.pages}
                      </p>
                    </div>

                    {selectedBook.price && (
                      <div className="bg-green-50 p-4 rounded-2xl">
                        <p className="text-sm text-gray-600 mb-1">
                          💶 Prix
                        </p>
                        <p className="font-semibold">
                          {selectedBook.price}
                        </p>
                      </div>
                    )}

                    {selectedBook.year && (
                      <div className="bg-purple-50 p-4 rounded-2xl">
                        <p className="text-sm text-gray-600 mb-1">
                          📅 Année de parution
                        </p>
                        <p className="font-semibold">
                          {selectedBook.year}
                        </p>
                      </div>
                    )}

                    {/* Dates de lecture */}
                    <div className="col-span-2 grid grid-cols-2 gap-3">
                      <div className="bg-indigo-50 p-4 rounded-2xl">
                        <p className="text-sm text-gray-600 mb-1">
                          🏁 Début
                        </p>
                        <p className="font-semibold">
                          {formatDate(selectedBook.startDate) || '-'}
                        </p>
                      </div>
                      <div className="bg-indigo-50 p-4 rounded-2xl">
                        <p className="text-sm text-gray-600 mb-1">
                          🏁 Fin
                        </p>
                        <p className="font-semibold">
                          {formatDate(selectedBook.endDate) || '-'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Genres */}
                  {selectedBook.genres?.length > 0 && (
                    <div className="bg-pink-50 p-4 rounded-2xl">
                      <p className="text-sm text-gray-600 mb-2">
                        🎨 Genres
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {selectedBook.genres.map((g, i) => (
                          <span
                            key={i}
                            className="px-3 py-1 bg-white rounded-full text-sm font-medium text-pink-600"
                          >
                            {g}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Suggéré par */}
                  {selectedBook.suggestedBy && (
                    <div className="bg-yellow-50 p-4 rounded-2xl">
                      <p className="text-sm text-gray-600 mb-1">
                        💡 Suggéré par
                      </p>
                      <p className="font-semibold">
                        {selectedBook.suggestedBy}
                      </p>
                    </div>
                  )}

                  {/* Résumé */}
                  {selectedBook.summary && (
                    <div className="bg-orange-50 p-4 rounded-2xl">
                      <p className="text-sm text-gray-600 mb-2">
                        📝 Résumé
                      </p>
                      <p className="text-sm">{selectedBook.summary}</p>
                    </div>
                  )}

                  {/* Section prêt */}
                  <div className="bg-teal-50 p-4 rounded-2xl">
                    <p className="text-sm text-gray-600 mb-2">
                      🤝 Prêt
                    </p>
                    <select
                      value={
                        selectedBook.loanStatus === 'borrowed' &&
                        selectedBook.loanTo
                          ? `borrowed:${selectedBook.loanTo}`
                          : selectedBook.loanStatus
                      }
                      onChange={(e) =>
                        updateLoanStatus(selectedBook, e.target.value)
                      }
                      className="w-full px-4 py-2 rounded-xl border-2 border-teal-100 outline-none bg-white text-sm"
                    >
                      <option value="notAvailable">
                        ❌ Prêt non disponible
                      </option>
                      <option value="shareable">
                        ✅ Peut être prêté
                      </option>
                      {members.map((m) => (
                        <option
                          key={m.id}
                          value={`borrowed:${m.name}`}
                        >
                          📚 Prêté à {m.name}
                        </option>
                      ))}
                    </select>
                    <p className="mt-2 text-xs text-gray-500">
                      Statut actuel:{' '}
                      {selectedBook.loanStatus === 'notAvailable'
                        ? 'non disponible'
                        : selectedBook.loanStatus === 'shareable'
                        ? 'peut être prêté'
                        : selectedBook.loanTo
                        ? `prêté à ${selectedBook.loanTo}`
                        : 'prêté'}
                    </p>
                  </div>

                  {/* Citations */}
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-bold flex items-center gap-2">
                        <Quote
                          size={20}
                          className="text-purple-500"
                        />
                        Citations & extraits
                      </h3>
                      <button
                        onClick={() => setShowAddQuote(true)}
                        className="bg-purple-500 text-white px-4 py-2 rounded-xl text-sm flex items-center gap-2"
                      >
                        <Plus size={16} /> Ajouter
                      </button>
                    </div>

                    {(selectedBook.quotes || []).map((q) => (
                      <div
                        key={q.id}
                        className="bg-purple-50 p-4 rounded-2xl mb-2 border-l-4 border-purple-400 flex justify-between"
                      >
                        <div>
                          <p className="font-bold text-purple-800 mb-2">
                            {q.member}
                          </p>
                          <p className="text-sm italic text-gray-700">
                            {q.text}
                          </p>
                        </div>
                        <div className="flex flex-col gap-2 items-end">
                          <button
                            title="Supprimer citation"
                            onClick={() => deleteQuote(q.id)}
                            className="text-red-500"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                    {(!selectedBook.quotes ||
                      selectedBook.quotes.length === 0) && (
                      <p className="text-gray-400 text-sm text-center py-4">
                        Aucune citation
                      </p>
                    )}
                  </div>

                  {/* Avis */}
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-bold">Avis</h3>
                      <button
                        onClick={() => setShowAddReview(true)}
                        className="bg-pink-500 text-white px-4 py-2 rounded-xl text-sm flex items-center gap-2"
                      >
                        <Plus size={16} /> Ajouter
                      </button>
                    </div>

                    {(selectedBook.reviews || []).map((r) => (
                      <div
                        key={r.id}
                        className="bg-pink-50 p-4 rounded-2xl mb-2"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <p className="font-bold">{r.member}</p>
                            {r.reading_time && (
                              <p className="text-xs text-gray-600 mt-1">
                                Temps de lecture : {r.reading_time}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Star
                              size={18}
                              className="fill-pink-400 text-pink-400"
                            />
                            <span className="font-bold text-pink-600">
                              {r.rating}/10
                            </span>
                            <button
                              title="Supprimer avis"
                              onClick={() => deleteReview(r.id)}
                              className="text-red-500"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>

                        {(r.writing ||
                          r.plot ||
                          r.characters ||
                          r.impact) && (
                          <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                            {r.writing && (
                              <div className="bg-white p-2 rounded-lg">
                                <p className="text-gray-600">
                                  ✍️ Écriture
                                </p>
                                <p className="font-semibold text-pink-600">
                                  {r.writing}/10
                                </p>
                              </div>
                            )}
                            {r.plot && (
                              <div className="bg-white p-2 rounded-lg">
                                <p className="text-gray-600">
                                  🧩 Intrigue
                                </p>
                                <p className="font-semibold text-pink-600">
                                  {r.plot}/10
                                </p>
                              </div>
                            )}
                            {r.characters && (
                              <div className="bg-white p-2 rounded-lg">
                                <p className="text-gray-600">
                                  👥 Personnages
                                </p>
                                <p className="font-semibold text-pink-600">
                                  {r.characters}/10
                                </p>
                              </div>
                            )}
                            {r.impact && (
                              <div className="bg-white p-2 rounded-lg">
                                <p className="text-gray-600">
                                  💥 Impact
                                </p>
                                <p className="font-semibold text-pink-600">
                                  {r.impact}/10
                                </p>
                              </div>
                            )}
                          </div>
                        )}

                        {r.comment && (
                          <p className="text-sm">{r.comment}</p>
                        )}
                      </div>
                    ))}

                    {(!selectedBook.reviews ||
                      selectedBook.reviews.length === 0) && (
                      <p className="text-gray-400 text-sm text-center py-4">
                        Aucun avis
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              // Rien sélectionné
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <BookOpen size={64} className="mb-4" />
                <p>Sélectionnez un livre ou un membre</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ------------------------
          Modales
         ------------------------ */}

      {/* Ajouter livre */}
      {showAddBook && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6">
              Nouveau livre / recommandation
            </h2>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Titre"
                value={newBook.title}
                onChange={(e) =>
                  setNewBook((prev) => ({
                    ...prev,
                    title: e.target.value
                  }))
                }
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 outline-none"
              />
              <input
                type="text"
                placeholder="Auteur"
                value={newBook.author}
                onChange={(e) =>
                  setNewBook((prev) => ({
                    ...prev,
                    author: e.target.value
                  }))
                }
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 outline-none"
              />

              {/* Cover upload */}
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center">
                <input
                  type="file"
                  id="coverImage"
                  accept="image/*"
                  onChange={handleCoverImageChange}
                  className="hidden"
                />
                <label
                  htmlFor="coverImage"
                  className="cursor-pointer"
                >
                  {coverImagePreview ? (
                    <img
                      src={coverImagePreview}
                      alt="Aperçu"
                      className="w-32 h-48 object-cover rounded-lg mx-auto mb-3"
                    />
                  ) : (
                    <Upload
                      size={48}
                      className="mx-auto mb-3 text-gray-400"
                    />
                  )}
                  <p className="text-sm text-gray-600">
                    {coverImagePreview
                      ? 'Changer la couverture'
                      : 'Ajouter une couverture (optionnel)'}
                  </p>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number"
                  placeholder="Pages"
                  value={newBook.pages}
                  onChange={(e) =>
                    setNewBook((prev) => ({
                      ...prev,
                      pages: e.target.value
                    }))
                  }
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 outline-none"
                />
                <input
                  type="text"
                  placeholder="Prix (ex: 18,90€)"
                  value={newBook.price}
                  onChange={(e) =>
                    setNewBook((prev) => ({
                      ...prev,
                      price: e.target.value
                    }))
                  }
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 outline-none"
                />
                <input
                  type="text"
                  placeholder="Année de parution"
                  value={newBook.year}
                  onChange={(e) =>
                    setNewBook((prev) => ({
                      ...prev,
                      year: e.target.value
                    }))
                  }
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 outline-none"
                />
                <input
                  type="text"
                  placeholder="Suggéré par (prénom)"
                  value={newBook.suggestedBy}
                  onChange={(e) =>
                    setNewBook((prev) => ({
                      ...prev,
                      suggestedBy: e.target.value
                    }))
                  }
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 outline-none"
                />
              </div>

              {/* Genres (tags) */}
              <div>
                <p className="text-sm text-gray-600 mb-1">Genres</p>

                <div className="flex flex-wrap gap-2 mb-2">
                  {newBook.genres.map((g, i) => (
                    <span
                      key={i}
                      className="px-3 py-1 bg-pink-100 text-pink-700 rounded-full text-xs flex items-center gap-1"
                    >
                      {g}
                      <button
                        type="button"
                        onClick={() =>
                          setNewBook((prev) => ({
                            ...prev,
                            genres: prev.genres.filter(
                              (_, idx) => idx !== i
                            )
                          }))
                        }
                        className="font-bold leading-none"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  {newBook.genres.length === 0 && (
                    <span className="text-xs text-gray-400">
                      Aucun genre pour l'instant
                    </span>
                  )}
                </div>

                <input
                  type="text"
                  placeholder="Tape un genre puis appuie sur Entrée"
                  value={newGenreInput}
                  onChange={(e) => setNewGenreInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ',') {
                      e.preventDefault();
                      setNewBook((prev) => ({
                        ...prev,
                        genres: addGenreToList(
                          prev.genres,
                          newGenreInput
                        )
                      }));
                      setNewGenreInput('');
                    }
                  }}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 outline-none"
                />
              </div>

              {/* Statut (onglet) + prêt initial */}
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={newBook.status}
                  onChange={(e) =>
                    setNewBook((prev) => ({
                      ...prev,
                      status: e.target.value
                    }))
                  }
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 outline-none bg-white"
                >
                  <option value="toRead">À lire</option>
                  <option value="reading">En cours</option>
                  <option value="read">Lu</option>
                  <option value="bookitheque">
                    Bookithèque (recommandation)
                  </option>
                </select>

                <select
                  value={newBook.loanStatus}
                  onChange={(e) =>
                    setNewBook((prev) => ({
                      ...prev,
                      loanStatus: e.target.value
                    }))
                  }
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 outline-none bg-white"
                >
                  <option value="notAvailable">
                    ❌ Prêt non disponible
                  </option>
                  <option value="shareable">
                    ✅ Peut être prêté
                  </option>
                </select>
              </div>

              <textarea
                placeholder="Résumé"
                value={newBook.summary}
                onChange={(e) =>
                  setNewBook((prev) => ({
                    ...prev,
                    summary: e.target.value
                  }))
                }
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 outline-none h-24 resize-none"
              />

              <div className="flex items-center gap-2 mt-2">
                <input
                  id="favoriteNew"
                  type="checkbox"
                  checked={newBook.isFavorite}
                  onChange={(e) =>
                    setNewBook((prev) => ({
                      ...prev,
                      isFavorite: e.target.checked
                    }))
                  }
                />
                <label
                  htmlFor="favoriteNew"
                  className="text-sm text-gray-700"
                >
                  Marquer comme coup de cœur 💖
                </label>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={addBook}
                disabled={isUploading}
                className="flex-1 bg-pink-500 text-white px-6 py-3 rounded-xl font-semibold disabled:opacity-60"
              >
                {isUploading ? 'Enregistrement…' : 'Ajouter'}
              </button>
              <button
                onClick={() => setShowAddBook(false)}
                className="flex-1 bg-gray-200 px-6 py-3 rounded-xl font-semibold"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modifier livre */}
      {editingBook && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6">Modifier le livre</h2>
            <div className="space-y-4">
              <input
                type="text"
                value={editingBook.title}
                onChange={(e) =>
                  setEditingBook((prev) => ({
                    ...prev,
                    title: e.target.value
                  }))
                }
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 outline-none"
              />
              <input
                type="text"
                value={editingBook.author}
                onChange={(e) =>
                  setEditingBook((prev) => ({
                    ...prev,
                    author: e.target.value
                  }))
                }
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 outline-none"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number"
                  value={editingBook.pages}
                  onChange={(e) =>
                    setEditingBook((prev) => ({
                      ...prev,
                      pages: e.target.value
                    }))
                  }
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 outline-none"
                />
                <input
                  type="text"
                  value={editingBook.price || ''}
                  onChange={(e) =>
                    setEditingBook((prev) => ({
                      ...prev,
                      price: e.target.value
                    }))
                  }
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 outline-none"
                />
                <input
                  type="text"
                  value={editingBook.year || ''}
                  onChange={(e) =>
                    setEditingBook((prev) => ({
                      ...prev,
                      year: e.target.value
                    }))
                  }
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 outline-none"
                />
                <input
                  type="text"
                  placeholder="Suggéré par"
                  value={editingBook.suggestedBy || ''}
                  onChange={(e) =>
                    setEditingBook((prev) => ({
                      ...prev,
                      suggestedBy: e.target.value
                    }))
                  }
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 outline-none"
                />
              </div>

              {/* Genres (tags) */}
              <div>
                <p className="text-sm text-gray-600 mb-1">Genres</p>

                <div className="flex flex-wrap gap-2 mb-2">
                  {(editingBook.genres || []).map((g, i) => (
                    <span
                      key={i}
                      className="px-3 py-1 bg-pink-100 text-pink-700 rounded-full text-xs flex items-center gap-1"
                    >
                      {g}
                      <button
                        type="button"
                        onClick={() =>
                          setEditingBook((prev) => ({
                            ...prev,
                            genres: prev.genres.filter(
                              (_, idx) => idx !== i
                            )
                          }))
                        }
                        className="font-bold leading-none"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  {(!editingBook.genres ||
                    editingBook.genres.length === 0) && (
                    <span className="text-xs text-gray-400">
                      Aucun genre pour l'instant
                    </span>
                  )}
                </div>

                <input
                  type="text"
                  placeholder="Tape un genre puis appuie sur Entrée"
                  value={editGenreInput}
                  onChange={(e) => setEditGenreInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ',') {
                      e.preventDefault();
                      setEditingBook((prev) => ({
                        ...prev,
                        genres: addGenreToList(
                          prev.genres || [],
                          editGenreInput
                        )
                      }));
                      setEditGenreInput('');
                    }
                  }}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 outline-none"
                />
              </div>

              <select
                value={editingBook.status}
                onChange={(e) =>
                  setEditingBook((prev) => ({
                    ...prev,
                    status: e.target.value
                  }))
                }
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 outline-none bg-white"
              >
                <option value="toRead">À lire</option>
                <option value="reading">En cours</option>
                <option value="read">Lu</option>
                <option value="bookitheque">
                  Bookithèque (recommandation)
                </option>
              </select>

              <textarea
                value={editingBook.summary || ''}
                onChange={(e) =>
                  setEditingBook((prev) => ({
                    ...prev,
                    summary: e.target.value
                  }))
                }
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 outline-none h-24 resize-none"
              />

              <div className="flex items-center gap-2">
                <input
                  id="favoriteEdit"
                  type="checkbox"
                  checked={!!editingBook.isFavorite}
                  onChange={(e) =>
                    setEditingBook((prev) => ({
                      ...prev,
                      isFavorite: e.target.checked
                    }))
                  }
                />
                <label
                  htmlFor="favoriteEdit"
                  className="text-sm text-gray-700"
                >
                  Coup de cœur 💖
                </label>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={updateBook}
                className="flex-1 bg-blue-500 text-white px-6 py-3 rounded-xl font-semibold"
              >
                Enregistrer
              </button>
              <button
                onClick={() => setEditingBook(null)}
                className="flex-1 bg-gray-200 px-6 py-3 rounded-xl font-semibold"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ajouter un avis */}
      {showAddReview && selectedBook && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6">
              Ajouter un avis
            </h2>
            <div className="space-y-4">
              <select
                value={newReview.member}
                onChange={(e) =>
                  setNewReview((prev) => ({
                    ...prev,
                    member: e.target.value
                  }))
                }
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 outline-none bg-white"
              >
                <option value="">Sélectionner un membre</option>
                {members.map((m) => (
                  <option key={m.id} value={m.name}>
                    {m.name}
                  </option>
                ))}
              </select>

              <input
                type="text"
                placeholder="Temps de lecture (ex: 2 semaines)"
                value={newReview.readingTime}
                onChange={(e) =>
                  setNewReview((prev) => ({
                    ...prev,
                    readingTime: e.target.value
                  }))
                }
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 outline-none"
              />

              <div className="space-y-3">
                <div className="bg-blue-50 p-4 rounded-xl">
                  <p className="text-sm font-semibold mb-2">
                    ✍️ Écriture & style
                  </p>
                  <StarRating
                    rating={newReview.writing}
                    onRate={(r) =>
                      setNewReview((prev) => ({
                        ...prev,
                        writing: r
                      }))
                    }
                  />
                </div>

                <div className="bg-purple-50 p-4 rounded-xl">
                  <p className="text-sm font-semibold mb-2">
                    🧩 Intrigue & structure
                  </p>
                  <StarRating
                    rating={newReview.plot}
                    onRate={(r) =>
                      setNewReview((prev) => ({
                        ...prev,
                        plot: r
                      }))
                    }
                  />
                </div>

                <div className="bg-pink-50 p-4 rounded-xl">
                  <p className="text-sm font-semibold mb-2">
                    👥 Personnages
                  </p>
                  <StarRating
                    rating={newReview.characters}
                    onRate={(r) =>
                      setNewReview((prev) => ({
                        ...prev,
                        characters: r
                      }))
                    }
                  />
                </div>

                <div className="bg-yellow-50 p-4 rounded-xl">
                  <p className="text-sm font-semibold mb-2">
                    💥 Impact & plaisir
                  </p>
                  <StarRating
                    rating={newReview.impact}
                    onRate={(r) =>
                      setNewReview((prev) => ({
                        ...prev,
                        impact: r
                      }))
                    }
                  />
                </div>

                {(newReview.writing ||
                  newReview.plot ||
                  newReview.characters ||
                  newReview.impact) > 0 && (
                  <div className="bg-gradient-to-r from-pink-100 to-purple-100 p-4 rounded-xl text-center">
                    <p className="text-sm text-gray-600 mb-1">
                      Note finale
                    </p>
                    <div className="flex items-center justify-center gap-2">
                      <Star
                        size={24}
                        className="fill-pink-500 text-pink-500"
                      />
                      <p className="text-3xl font-bold text-pink-600">
                        {(
                          (newReview.writing +
                            newReview.plot +
                            newReview.characters +
                            newReview.impact) /
                          4
                        ).toFixed(1)}
                        /10
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <textarea
                placeholder="Commentaire (optionnel)"
                value={newReview.comment}
                onChange={(e) =>
                  setNewReview((prev) => ({
                    ...prev,
                    comment: e.target.value
                  }))
                }
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 outline-none h-24 resize-none"
              />
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={addReview}
                className="flex-1 bg-pink-500 text-white px-6 py-3 rounded-xl font-semibold"
              >
                Publier
              </button>
              <button
                onClick={() => setShowAddReview(false)}
                className="flex-1 bg-gray-200 px-6 py-3 rounded-xl font-semibold"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ajouter une citation */}
      {showAddQuote && selectedBook && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-6">
              Ajouter une citation
            </h2>
            <div className="space-y-4">
              <select
                value={newQuote.member}
                onChange={(e) =>
                  setNewQuote((prev) => ({
                    ...prev,
                    member: e.target.value
                  }))
                }
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 outline-none bg-white"
              >
                <option value="">Sélectionner un membre</option>
                {members.map((m) => (
                  <option key={m.id} value={m.name}>
                    {m.name}
                  </option>
                ))}
              </select>

              <textarea
                placeholder="Extrait ou citation…"
                value={newQuote.text}
                onChange={(e) =>
                  setNewQuote((prev) => ({
                    ...prev,
                    text: e.target.value
                  }))
                }
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 outline-none h-32 resize-none"
              />
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={addQuote}
                className="flex-1 bg-purple-500 text-white px-6 py-3 rounded-xl font-semibold"
              >
                Publier
              </button>
              <button
                onClick={() => setShowAddQuote(false)}
                className="flex-1 bg-gray-200 px-6 py-3 rounded-xl font-semibold"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ajouter un membre */}
      {showAddMember && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-6">Nouveau membre</h2>
            <input
              type="text"
              placeholder="Prénom"
              value={newMemberName}
              onChange={(e) => setNewMemberName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 outline-none"
            />
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  if (!newMemberName.trim()) {
                    alert('Nom requis');
                    return;
                  }
                  addMember();
                }}
                className="flex-1 bg-blue-500 text-white px-6 py-3 rounded-xl font-semibold"
              >
                Ajouter
              </button>
              <button
                onClick={() => setShowAddMember(false)}
                className="flex-1 bg-gray-200 px-6 py-3 rounded-xl font-semibold"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
