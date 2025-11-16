// BookClubTracker.js
'use client'

import React, { useEffect, useState } from 'react';
import {
  Star, BookOpen, Users, Sparkles, Plus, Trash2, Edit2, CheckCircle, Clock, Upload, Quote
} from 'lucide-react';
import { supabase } from '../lib/supabase';

/**
 * BookClubTracker
 * - Full rewritten component implementing:
 *   * list view with title, author, cover, suggested by, pages, price, year, genres
 *   * detail view with "Année de parution" label and start/end reading dates shown on the same line
 *   * ability to add / delete reviews and quotes
 *   * add / edit / delete books & members
 *
 * Note: adapte les noms de table/colonnes si besoin pour correspondre à ta base Supabase
 */

export default function BookClubTracker() {
  // State
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

  const [activeTab, setActiveTab] = useState('toRead'); // toRead | reading | read

  // Upload
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
    status: 'toRead',
    startDate: '',
    endDate: '',
    suggestedBy: '',
    year: '',
    genres: []
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

  // Load initial data
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

      const transformedBooks = (booksData || []).map(b => ({
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

  /* -----------------------
     Image upload helpers
     ----------------------- */
  const handleCoverImageChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) {
      alert('L\'image est trop lourde (max 5MB).');
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
      const { error: uploadError } = await supabase.storage.from('covers').upload(path, file);
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('covers').getPublicUrl(path);
      return data?.publicUrl || null;
    } catch (err) {
      console.error('uploadCoverImageToStorage error', err);
      throw err;
    }
  };

  /* -----------------------
     Books CRUD
     ----------------------- */
  const addBook = async () => {
    if (!newBook.title || !newBook.author) {
      alert('Titre et auteur requis.');
      return;
    }
    setIsUploading(true);
    try {
      let coverUrl = '';
      if (coverImageFile) coverUrl = await uploadCoverImageToStorage(coverImageFile);

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
        genres: newBook.genres || []
      };

      const { data, error } = await supabase.from('books').insert([insertObj]).select('*, reviews(*), quotes(*)').single();
      if (error) throw error;

      const b = {
        id: data.id,
        title: data.title,
        author: data.author,
        pages: data.pages,
        price: data.price,
        summary: data.summary,
        coverUrl: data.cover_url,
        status: data.status,
        startDate: data.start_date,
        endDate: data.end_date,
        suggestedBy: data.suggested_by,
        year: data.year,
        genres: data.genres || [],
        reviews: data.reviews || [],
        quotes: data.quotes || []
      };

      setBooks(prev => [b, ...prev]);
      resetNewBookForm();
      setShowAddBook(false);
    } catch (err) {
      console.error('addBook error', err);
      alert('Erreur lors de l\'ajout du livre.');
    } finally {
      setIsUploading(false);
    }
  };

  const resetNewBookForm = () => {
    setNewBook({
      title: '', author: '', pages: '', price: '', summary: '',
      status: 'toRead', startDate: '', endDate: '', suggestedBy: '', year: '', genres: []
    });
    setCoverImageFile(null);
    setCoverImagePreview('');
  };

  const deleteBook = async (bookId) => {
    if (!confirm('Supprimer ce livre ? Cette action est irréversible.')) return;
    try {
      const book = books.find(b => b.id === bookId);
      // attempt to remove cover from storage if present (best effort)
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

      setBooks(prev => prev.filter(b => b.id !== bookId));
      if (selectedBook?.id === bookId) setSelectedBook(null);
    } catch (err) {
      console.error('deleteBook error', err);
      alert('Impossible de supprimer le livre.');
    }
  };

  const updateBook = async () => {
    if (!editingBook) return;
    try {
      const { error } = await supabase.from('books').update({
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
        genres: editingBook.genres || []
      }).eq('id', editingBook.id);

      if (error) throw error;

      setBooks(prev => prev.map(b => (b.id === editingBook.id ? { ...b, ...editingBook } : b)));
      if (selectedBook?.id === editingBook.id) setSelectedBook(editingBook);
      setEditingBook(null);
    } catch (err) {
      console.error('updateBook error', err);
      alert('Impossible de modifier le livre.');
    }
  };

  const toggleBookStatus = async (bookId) => {
    const book = books.find(b => b.id === bookId);
    if (!book) return;
    let newStatus = book.status === 'toRead' ? 'reading' : book.status === 'reading' ? 'read' : 'toRead';
    try {
      const { error } = await supabase.from('books').update({ status: newStatus }).eq('id', bookId);
      if (error) throw error;
      setBooks(prev => prev.map(b => (b.id === bookId ? { ...b, status: newStatus } : b)));
      if (selectedBook?.id === bookId) setSelectedBook(prev => ({ ...prev, status: newStatus }));
    } catch (err) {
      console.error('toggleBookStatus error', err);
    }
  };

  /* -----------------------
     Reviews (add & delete)
     ----------------------- */
  const addReview = async () => {
    if (!selectedBook) return;
    if (!newReview.member || (newReview.writing + newReview.plot + newReview.characters + newReview.impact) === 0) {
      alert('Sélectionnez un membre et notez au moins une catégorie.');
      return;
    }

    const average = ((newReview.writing + newReview.plot + newReview.characters + newReview.impact) / 4).toFixed(1);

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

      const { data, error } = await supabase.from('reviews').insert([payload]).select().single();
      if (error) throw error;

      // update local state
      const updatedBook = { ...selectedBook, reviews: [...(selectedBook.reviews || []), data] };
      setBooks(prev => prev.map(b => (b.id === selectedBook.id ? updatedBook : b)));
      setSelectedBook(updatedBook);
      setNewReview({ member: '', writing: 0, plot: 0, characters: 0, impact: 0, readingTime: '', comment: '' });
      setShowAddReview(false);
    } catch (err) {
      console.error('addReview error', err);
      alert('Impossible d\'ajouter l\'avis.');
    }
  };

  const deleteReview = async (reviewId) => {
    if (!confirm('Supprimer cet avis ?')) return;
    try {
      const { error } = await supabase.from('reviews').delete().eq('id', reviewId);
      if (error) throw error;

      // remove from local state
      setBooks(prev => prev.map(b => {
        if (!b.reviews) return b;
        return { ...b, reviews: b.reviews.filter(r => r.id !== reviewId) };
      }));
      if (selectedBook) {
        setSelectedBook(prev => prev ? ({ ...prev, reviews: prev.reviews.filter(r => r.id !== reviewId) }) : prev);
      }
    } catch (err) {
      console.error('deleteReview error', err);
      alert('Impossible de supprimer l\'avis.');
    }
  };

  /* -----------------------
     Quotes (add & delete)
     ----------------------- */
  const addQuote = async () => {
    if (!selectedBook) return;
    if (!newQuote.member || !newQuote.text.trim()) {
      alert('Sélectionner un membre et écrire un extrait.');
      return;
    }
    try {
      const payload = { book_id: selectedBook.id, member: newQuote.member, text: newQuote.text.trim() };
      const { data, error } = await supabase.from('quotes').insert([payload]).select().single();
      if (error) throw error;

      const updatedBook = { ...selectedBook, quotes: [...(selectedBook.quotes || []), data] };
      setBooks(prev => prev.map(b => (b.id === selectedBook.id ? updatedBook : b)));
      setSelectedBook(updatedBook);
      setNewQuote({ member: '', text: '' });
      setShowAddQuote(false);
    } catch (err) {
      console.error('addQuote error', err);
      alert('Impossible d\'ajouter la citation.');
    }
  };

  const deleteQuote = async (quoteId) => {
    if (!confirm('Supprimer cette citation ?')) return;
    try {
      const { error } = await supabase.from('quotes').delete().eq('id', quoteId);
      if (error) throw error;

      setBooks(prev => prev.map(b => {
        if (!b.quotes) return b;
        return { ...b, quotes: b.quotes.filter(q => q.id !== quoteId) };
      }));

      if (selectedBook) {
        setSelectedBook(prev => prev ? ({ ...prev, quotes: prev.quotes.filter(q => q.id !== quoteId) }) : prev);
      }
    } catch (err) {
      console.error('deleteQuote error', err);
      alert('Impossible de supprimer la citation.');
    }
  };

  /* -----------------------
     Members CRUD
     ----------------------- */
  const addMember = async () => {
    if (!newMemberName.trim) return;
    try {
      const { data, error } = await supabase.from('members').insert([{ name: newMemberName.trim() }]).select().single();
      if (error) throw error;
      setMembers(prev => [...prev, data]);
      setShowAddMember(false);
      setNewMemberName('');
    } catch (err) {
      console.error('addMember error', err);
      alert('Impossible d\'ajouter le membre.');
    }
  };

  const [newMemberName, setNewMemberName] = useState('');

  const deleteMember = async (memberId) => {
    if (!confirm('Supprimer ce membre ?')) return;
    try {
      const { error } = await supabase.from('members').delete().eq('id', memberId);
      if (error) throw error;
      setMembers(prev => prev.filter(m => m.id !== memberId));
      if (selectedMember?.id === memberId) setSelectedMember(null);
    } catch (err) {
      console.error('deleteMember error', err);
      alert('Impossible de supprimer le membre.');
    }
  };

  /* -----------------------
     Utils & derived lists
     ----------------------- */
  const toReadBooks = books.filter(b => b.status === 'toRead');
  const readingBooks = books.filter(b => b.status === 'reading');
  const readBooks = books.filter(b => b.status === 'read');
  const displayBooks = activeTab === 'toRead' ? toReadBooks : activeTab === 'reading' ? readingBooks : readBooks;

  const drawRandomBook = () => {
    if (toReadBooks.length === 0) {
      alert('Aucun livre à lire pour le moment.');
      return;
    }
    const r = toReadBooks[Math.floor(Math.random() * toReadBooks.length)];
    setSelectedBook(r);
    setActiveTab('toRead');
    setSelectedMember(null);
  };

  const getMemberActivity = (memberName) => {
    const suggestedBooks = books.filter(b => b.suggestedBy === memberName);
    const reviews = books.flatMap(b => (b.reviews || []).filter(r => r.member === memberName).map(r => ({ ...r, bookTitle: b.title, bookId: b.id })));
    const quotes = books.flatMap(b => (b.quotes || []).filter(q => q.member === memberName).map(q => ({ ...q, bookTitle: b.title, bookId: b.id })));
    return { suggestedBooks, reviews, quotes };
  };

  const formatDate = (d) => {
    if (!d) return '';
    try {
      return new Date(d).toLocaleDateString('fr-FR');
    } catch {
      return d;
    }
  };

  /* -----------------------
     Small subcomponent: StarRating used in add review
     ----------------------- */
  const StarRating = ({ rating, onRate, readonly = false }) => {
    const max = 10; // keep same as original
    return (
      <div className="flex gap-1">
        {[...Array(max)].map((_, idx) => {
          const val = idx + 1;
          return (
            <Star
              key={val}
              size={18}
              className={`${rating >= val ? 'fill-pink-400 text-pink-400' : 'text-gray-300'} ${!readonly ? 'cursor-pointer hover:fill-pink-300 hover:text-pink-300' : ''}`}
              onClick={() => !readonly && onRate(val)}
            />
          );
        })}
      </div>
    );
  };

  /* -----------------------
     Render
     ----------------------- */
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50">
        <div className="text-center">
          <BookOpen size={64} className="text-pink-500 animate-pulse mx-auto mb-4" />
          <p className="text-xl text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-3xl shadow-lg p-8 mb-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-br from-pink-400 to-purple-500 p-4 rounded-2xl">
                <BookOpen className="text-white" size={32} />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">Booki Club</h1>
                <p className="text-gray-600 flex items-center gap-2 mt-1 text-sm">
                  <Users size={16} />
                  {books.length} livre{books.length > 1 ? 's' : ''} • {toReadBooks.length} à lire • {readingBooks.length} en cours • {readBooks.length} lu{readBooks.length > 1 ? 's' : ''}
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={drawRandomBook} className="bg-gradient-to-r from-yellow-400 to-orange-400 text-white px-6 py-3 rounded-xl font-semibold flex items-center gap-2 hover:shadow-lg transform hover:scale-105 transition-all">
                <Sparkles size={20} />
                Tirage au sort
              </button>
              <button onClick={() => setShowAddBook(true)} className="bg-gradient-to-r from-pink-400 to-purple-500 text-white px-6 py-3 rounded-xl font-semibold flex items-center gap-2 hover:shadow-lg transform hover:scale-105 transition-all">
                <Plus size={20} />
                Ajouter
              </button>
            </div>
          </div>
        </div>

        {/* Members */}
        <div className="bg-white rounded-3xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-blue-400 to-purple-500 p-3 rounded-xl">
                <Users className="text-white" size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-800">Membres</h2>
                <p className="text-sm text-gray-600">{members.length} membre{members.length > 1 ? 's' : ''}</p>
              </div>
            </div>
            <button onClick={() => setShowAddMember(true)} className="bg-gradient-to-r from-blue-400 to-purple-500 text-white px-5 py-2 rounded-xl font-semibold flex items-center gap-2 hover:shadow-lg">
              <Plus size={18} />
              Ajouter
            </button>
          </div>

          <div className="flex flex-wrap gap-3">
            {members.map(m => (
              <div
                key={m.id}
                onClick={() => { setSelectedMember(m); setSelectedBook(null); }}
                className="px-4 py-2 rounded-xl flex items-center gap-2 group cursor-pointer bg-gradient-to-r from-blue-50 to-purple-50 hover:shadow-md"
              >
                <span className="font-semibold text-gray-800">{m.name}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteMember(m.id); }}
                  className="p-1 rounded-lg opacity-0 group-hover:opacity-100 text-red-500 hover:bg-red-100"
                  title="Supprimer membre"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            {members.length === 0 && <p className="text-gray-400 text-sm">Aucun membre</p>}
          </div>
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* List column */}
          <div className="bg-white rounded-3xl shadow-lg p-6">
            <div className="flex gap-2 mb-4">
              {[
                { key: 'toRead', icon: Clock, label: 'À lire', count: toReadBooks.length, color: 'from-orange-400 to-pink-400' },
                { key: 'reading', icon: BookOpen, label: 'En cours', count: readingBooks.length, color: 'from-blue-400 to-purple-400' },
                { key: 'read', icon: CheckCircle, label: 'Lus', count: readBooks.length, color: 'from-green-400 to-teal-400' }
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => { setActiveTab(tab.key); setSelectedMember(null); }}
                  className={`flex-1 py-3 px-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${activeTab === tab.key && !selectedMember ? `bg-gradient-to-r ${tab.color} text-white shadow-md` : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  <tab.icon size={18} />
                  <span className="hidden sm:inline">{tab.label}</span> ({tab.count})
                </button>
              ))}
            </div>

            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {displayBooks.map(book => (
                <div
                  key={book.id}
                  onClick={() => { setSelectedBook(book); setSelectedMember(null); }}
                  className={`p-4 rounded-2xl cursor-pointer transition-all ${selectedBook?.id === book.id ? 'bg-gradient-to-r from-pink-100 to-purple-100 shadow-md' : 'bg-gray-50 hover:bg-gray-100'}`}
                >
                  <div className="flex gap-4">
                    {book.coverUrl ? (
                      <img src={book.coverUrl} alt={book.title} className="w-16 h-24 object-cover rounded-lg shadow-md" />
                    ) : (
                      <div className="w-16 h-24 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">
                        <BookOpen />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-800 truncate">{book.title}</h3>
                      <p className="text-sm text-gray-600 truncate">{book.author}</p>

                      {book.suggestedBy && (
                        <p className="text-xs text-purple-600 mt-1">Suggéré par {book.suggestedBy}</p>
                      )}


{/* Ligne 1 : pages + prix + année */}
<div className="flex gap-2 mt-2 text-xs text-gray-500">
  <span>📖 {book.pages}p</span>
  {book.price && <span>💰 {book.price}</span>}
  {book.year && <span>📅 {book.year}</span>}
</div>

{/* Ligne 2 : genres seuls */}
{book.genres?.length > 0 && (
  <div className="mt-1 text-xs text-gray-500">
    🏷️ {book.genres.join(', ')}
  </div>
)}


                  

                      {book.reviews?.length > 0 && (
                        <div className="flex items-center gap-2 mt-2">
                          <Star size={14} className="fill-pink-400 text-pink-400" />
                          <span className="text-sm font-semibold text-pink-600">
                            {(book.reviews.reduce((a, r) => a + (r.rating || 0), 0) / book.reviews.length).toFixed(1)}/10
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleBookStatus(book.id); }}
                        className={`p-2 rounded-lg ${book.status === 'read' ? 'bg-green-100 text-green-600' : book.status === 'reading' ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'}`}
                        title="Changer le statut"
                      >
                        {book.status === 'read' ? <CheckCircle size={16} /> : book.status === 'reading' ? <BookOpen size={16} /> : <Clock size={16} />}
                      </button>

                      <button
                        onClick={(e) => { e.stopPropagation(); setEditingBook(book); }}
                        className="p-2 rounded-lg bg-blue-100 text-blue-600"
                        title="Modifier"
                      >
                        <Edit2 size={16} />
                      </button>

                      <button
                        onClick={(e) => { e.stopPropagation(); deleteBook(book.id); }}
                        className="p-2 rounded-lg bg-red-100 text-red-600"
                        title="Supprimer"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {displayBooks.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  <BookOpen size={48} className="mx-auto mb-3 opacity-50" />
                  <p>Aucun livre</p>
                </div>
              )}
            </div>
          </div>

          {/* Detail column */}
          <div className="bg-white rounded-3xl shadow-lg p-6">
            {selectedMember ? (
              <div>
                <div className="text-center mb-6">
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full mx-auto mb-3 flex items-center justify-center text-white text-3xl font-bold">
                    {selectedMember.name?.[0] || '?'}
                  </div>
                  <h2 className="text-2xl font-bold text-gray-800">{selectedMember.name}</h2>
                  <button onClick={() => setSelectedMember(null)} className="text-sm text-gray-500 hover:text-gray-700 mt-2">← Retour aux livres</button>
                </div>

                <div className="space-y-6 max-h-[500px] overflow-y-auto">
                  <div>
                    <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                      <Sparkles size={20} className="text-yellow-500" />
                      Livres suggérés ({getMemberActivity(selectedMember.name).suggestedBooks.length})
                    </h3>
                    {getMemberActivity(selectedMember.name).suggestedBooks.map(b => (
                      <div
                        key={b.id}
                        onClick={() => { setSelectedBook(b); setSelectedMember(null); }}
                        className="bg-yellow-50 p-4 rounded-2xl mb-2 cursor-pointer hover:shadow-md"
                      >
                        <p className="font-bold text-gray-800">{b.title}</p>
                        <p className="text-sm text-gray-600">{b.author}</p>
                      </div>
                    ))}
                    {getMemberActivity(selectedMember.name).suggestedBooks.length === 0 && <p className="text-gray-400 text-sm">Aucun livre suggéré</p>}
                  </div>

                  <div>
                    <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                      <Star size={20} className="text-pink-500" />
                      Avis ({getMemberActivity(selectedMember.name).reviews.length})
                    </h3>

                    {getMemberActivity(selectedMember.name).reviews.map(r => (
                      <div
                        key={r.id}
                        className="bg-pink-50 p-4 rounded-2xl mb-2"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <p className="font-bold">{r.bookTitle}</p>
                            <p className="text-xs text-gray-600 mt-1">{r.comment}</p>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-pink-600">{r.rating}/10</span>
                              <button onClick={() => deleteReview(r.id)} title="Supprimer avis" className="text-red-500">
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    {getMemberActivity(selectedMember.name).reviews.length === 0 && <p className="text-gray-400 text-sm">Aucun avis</p>}
                  </div>

                  <div>
                    <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                      <Quote size={20} className="text-purple-500" />
                      Citations ({getMemberActivity(selectedMember.name).quotes.length})
                    </h3>

                    {getMemberActivity(selectedMember.name).quotes.map(q => (
                      <div key={q.id} className="bg-purple-50 p-4 rounded-2xl mb-2">
                        <div className="flex justify-between">
                          <div>
                            <p className="font-bold text-gray-800 mb-1">{q.bookTitle}</p>
                            <p className="text-sm italic text-gray-700">{q.text}</p>
                          </div>
                          <div className="flex items-start gap-2">
                            <button onClick={() => { setSelectedBook(books.find(b => b.id === q.bookId)); setSelectedMember(null); }} className="text-blue-600">
                              Voir
                            </button>
                            <button onClick={() => deleteQuote(q.id)} title="Supprimer citation" className="text-red-500">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}

                    {getMemberActivity(selectedMember.name).quotes.length === 0 && <p className="text-gray-400 text-sm">Aucune citation</p>}
                  </div>
                </div>
              </div>
            ) : selectedBook ? (
              <div>
                {/* Cover */}
                {selectedBook.coverUrl ? (
                  <div className="flex justify-center mb-6">
                    <img src={selectedBook.coverUrl} alt={selectedBook.title} className="w-48 h-72 object-cover rounded-xl shadow-lg" />
                  </div>
                ) : null}

                <h2 className="text-2xl font-bold text-gray-800 text-center mb-1">{selectedBook.title}</h2>
                <p className="text-center text-gray-600 mb-4">{selectedBook.author}</p>

                <div className="space-y-4 max-h-[500px] overflow-y-auto">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-blue-50 p-4 rounded-2xl">
                      <p className="text-sm text-gray-600 mb-1">📖 Pages</p>
                      <p className="font-semibold">{selectedBook.pages}</p>
                    </div>

                    {selectedBook.price && (
                      <div className="bg-green-50 p-4 rounded-2xl">
                        <p className="text-sm text-gray-600 mb-1">💰 Prix</p>
                        <p className="font-semibold">{selectedBook.price}</p>
                      </div>
                    )}

                    {selectedBook.year && (
                      <div className="bg-purple-50 p-4 rounded-2xl">
                        <p className="text-sm text-gray-600 mb-1">📅 Année de parution</p>
                        <p className="font-semibold">{selectedBook.year}</p>
                      </div>
                    )}

                    {/* Start & End dates: shown on the same row (side-by-side) */}
                    <div className="col-span-2 grid grid-cols-2 gap-3">
                      <div className="bg-indigo-50 p-4 rounded-2xl">
                        <p className="text-sm text-gray-600 mb-1">📌 Date de début de lecture</p>
                        <p className="font-semibold text-sm">{formatDate(selectedBook.startDate) || '-'}</p>
                      </div>
                      <div className="bg-teal-50 p-4 rounded-2xl">
                        <p className="text-sm text-gray-600 mb-1">📌 Date de fin de lecture</p>
                        <p className="font-semibold text-sm">{formatDate(selectedBook.endDate) || '-'}</p>
                      </div>
                    </div>
                  </div>

                  {selectedBook.genres?.length > 0 && (
                    <div className="bg-pink-50 p-4 rounded-2xl">
                      <p className="text-sm text-gray-600 mb-2">🏷️ Genres</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedBook.genres.map((g, i) => <span key={i} className="px-3 py-1 bg-white rounded-full text-sm font-medium text-pink-600">{g}</span>)}
                      </div>
                    </div>
                  )}

                  {selectedBook.suggestedBy && (
                    <div className="bg-yellow-50 p-4 rounded-2xl">
                      <p className="text-sm text-gray-600 mb-1">✨ Suggéré par</p>
                      <p className="font-semibold">{selectedBook.suggestedBy}</p>
                    </div>
                  )}

                  {selectedBook.summary && (
                    <div className="bg-orange-50 p-4 rounded-2xl">
                      <p className="text-sm text-gray-600 mb-2">📝 Résumé</p>
                      <p className="text-sm">{selectedBook.summary}</p>
                    </div>
                  )}

                  {/* Quotes */}
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-bold flex items-center gap-2">
                        <Quote size={20} className="text-purple-500" />
                        Citations & Extraits
                      </h3>
                      <button onClick={() => setShowAddQuote(true)} className="bg-purple-500 text-white px-4 py-2 rounded-xl text-sm flex items-center gap-2">
                        <Plus size={16} /> Ajouter
                      </button>
                    </div>

                    {(selectedBook.quotes || []).map(q => (
                      <div key={q.id} className="bg-purple-50 p-4 rounded-2xl mb-2 border-l-4 border-purple-400 flex justify-between">
                        <div>
                          <p className="font-bold text-purple-800 mb-2">{q.member}</p>
                          <p className="text-sm italic text-gray-700">{q.text}</p>
                        </div>
                        <div className="flex flex-col gap-2 items-end">
                          <button title="Supprimer citation" onClick={() => deleteQuote(q.id)} className="text-red-500">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                    {(!selectedBook.quotes || selectedBook.quotes.length === 0) && (
                      <p className="text-gray-400 text-sm text-center py-4">Aucune citation</p>
                    )}
                  </div>

                  {/* Reviews */}
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-bold">Avis</h3>
                      <button onClick={() => setShowAddReview(true)} className="bg-pink-500 text-white px-4 py-2 rounded-xl text-sm flex items-center gap-2">
                        <Plus size={16} /> Ajouter
                      </button>
                    </div>

                    {(selectedBook.reviews || []).map(r => (
                      <div key={r.id} className="bg-pink-50 p-4 rounded-2xl mb-2">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <p className="font-bold">{r.member}</p>
                            {r.reading_time && <p className="text-xs text-gray-600 mt-1">⏱️ Temps de lecture: {r.reading_time}</p>}
                          </div>

                          <div className="text-right flex flex-col items-end gap-2">
                            <div className="flex items-center gap-1">
                              <Star size={16} className="fill-pink-400 text-pink-400" />
                              <span className="font-bold text-lg text-pink-600">{r.rating}/10</span>
                            </div>
                            <button title="Supprimer avis" onClick={() => deleteReview(r.id)} className="text-red-500">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>

                        {(r.writing || r.plot || r.characters || r.impact) && (
                          <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                            <div className="bg-white p-2 rounded-lg">
                              <p className="text-gray-600">✍️ Écriture</p>
                              <p className="font-semibold text-pink-600">{r.writing}/10</p>
                            </div>
                            <div className="bg-white p-2 rounded-lg">
                              <p className="text-gray-600">📖 Intrigue</p>
                              <p className="font-semibold text-pink-600">{r.plot}/10</p>
                            </div>
                            <div className="bg-white p-2 rounded-lg">
                              <p className="text-gray-600">👥 Personnages</p>
                              <p className="font-semibold text-pink-600">{r.characters}/10</p>
                            </div>
                            <div className="bg-white p-2 rounded-lg">
                              <p className="text-gray-600">💫 Impact</p>
                              <p className="font-semibold text-pink-600">{r.impact}/10</p>
                            </div>
                          </div>
                        )}

                        {r.comment && <p className="text-sm">{r.comment}</p>}
                      </div>
                    ))}

                    {(!selectedBook.reviews || selectedBook.reviews.length === 0) && (
                      <p className="text-gray-400 text-sm text-center py-4">Aucun avis</p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <BookOpen size={64} className="mb-4" />
                <p>Sélectionnez un livre ou un membre</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ------------------------
          Modals (Add Book / Edit / Add Review / Add Quote / Add Member)
         ------------------------ */}

      {/* Add Book */}
      {showAddBook && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6">Nouveau livre</h2>
            <div className="space-y-4">
              <input type="text" placeholder="Titre" value={newBook.title} onChange={e => setNewBook(prev => ({ ...prev, title: e.target.value }))} className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 outline-none" />
              <input type="text" placeholder="Auteur" value={newBook.author} onChange={e => setNewBook(prev => ({ ...prev, author: e.target.value }))} className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 outline-none" />

              <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center">
                <input type="file" id="coverImage" accept="image/*" onChange={handleCoverImageChange} className="hidden" />
                <label htmlFor="coverImage" className="cursor-pointer">
                  {coverImagePreview ? <img src={coverImagePreview} alt="Aperçu" className="w-32 h-48 object-cover rounded-lg mx-auto mb-3" /> : <Upload size={48} className="mx-auto mb-3 text-gray-400" />}
                  <p className="text-sm text-gray-600">{coverImagePreview ? 'Changer l\'image' : 'Charger une couverture'}</p>
                </label>
              </div>

              <input type="number" placeholder="Pages" value={newBook.pages} onChange={e => setNewBook(prev => ({ ...prev, pages: e.target.value }))} className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 outline-none" />
              <input type="text" placeholder="Prix" value={newBook.price} onChange={e => setNewBook(prev => ({ ...prev, price: e.target.value }))} className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 outline-none" />
              <input type="text" placeholder="Année de publication" value={newBook.year} onChange={e => setNewBook(prev => ({ ...prev, year: e.target.value }))} className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 outline-none" />

              <div>
                <input type="text" placeholder="Genres (séparés par des virgules)" value={newBook.genres.join(', ')} onChange={e => setNewBook(prev => ({ ...prev, genres: e.target.value.split(',').map(g => g.trim()).filter(Boolean) }))} className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 outline-none" />
                <p className="text-xs text-gray-500 mt-1 ml-1">Ex: Romance, Fantasy, Thriller</p>
              </div>

              <input type="date" placeholder="Date de début de lecture" value={newBook.startDate || ''} onChange={e => setNewBook(prev => ({ ...prev, startDate: e.target.value }))} className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 outline-none" />
              <input type="date" placeholder="Date de fin de lecture" value={newBook.endDate || ''} onChange={e => setNewBook(prev => ({ ...prev, endDate: e.target.value }))} className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 outline-none" />

              <select value={newBook.suggestedBy || ''} onChange={e => setNewBook(prev => ({ ...prev, suggestedBy: e.target.value }))} className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 outline-none bg-white">
                <option value="">Suggéré par...</option>
                {members.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
              </select>

              <textarea placeholder="Résumé" value={newBook.summary} onChange={e => setNewBook(prev => ({ ...prev, summary: e.target.value }))} className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 outline-none h-24 resize-none" />
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={addBook} disabled={isUploading} className="flex-1 bg-pink-500 text-white px-6 py-3 rounded-xl font-semibold disabled:opacity-50">
                {isUploading ? 'Upload...' : 'Ajouter'}
              </button>
              <button onClick={() => { setShowAddBook(false); resetNewBookForm(); }} disabled={isUploading} className="flex-1 bg-gray-200 px-6 py-3 rounded-xl font-semibold">Annuler</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Book */}
      {editingBook && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6">Modifier le livre</h2>
            <div className="space-y-4">
              <input type="text" value={editingBook.title} onChange={e => setEditingBook(prev => ({ ...prev, title: e.target.value }))} className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 outline-none" />
              <input type="text" value={editingBook.author} onChange={e => setEditingBook(prev => ({ ...prev, author: e.target.value }))} className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 outline-none" />
              <input type="number" value={editingBook.pages} onChange={e => setEditingBook(prev => ({ ...prev, pages: e.target.value }))} className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 outline-none" />
              <input type="text" value={editingBook.price} onChange={e => setEditingBook(prev => ({ ...prev, price: e.target.value }))} className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 outline-none" />
              <input type="text" placeholder="Année" value={editingBook.year || ''} onChange={e => setEditingBook(prev => ({ ...prev, year: e.target.value }))} className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 outline-none" />

              <div>
                <input type="text" placeholder="Genres (séparés par des virgules)" value={editingBook.genres?.join(', ') || ''} onChange={e => setEditingBook(prev => ({ ...prev, genres: e.target.value.split(',').map(g => g.trim()).filter(Boolean) }))} className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 outline-none" />
                <p className="text-xs text-gray-500 mt-1 ml-1">Ex: Romance, Fantasy, Thriller</p>
              </div>

              <input type="date" placeholder="Date de début" value={editingBook.startDate || ''} onChange={e => setEditingBook(prev => ({ ...prev, startDate: e.target.value }))} className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 outline-none" />
              <input type="date" placeholder="Date de fin" value={editingBook.endDate || ''} onChange={e => setEditingBook(prev => ({ ...prev, endDate: e.target.value }))} className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 outline-none" />
              <textarea value={editingBook.summary || ''} onChange={e => setEditingBook(prev => ({ ...prev, summary: e.target.value }))} className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 outline-none h-24 resize-none" />
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={updateBook} className="flex-1 bg-blue-500 text-white px-6 py-3 rounded-xl font-semibold">Enregistrer</button>
              <button onClick={() => setEditingBook(null)} className="flex-1 bg-gray-200 px-6 py-3 rounded-xl font-semibold">Annuler</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Review */}
      {showAddReview && selectedBook && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6">Ajouter un avis</h2>
            <div className="space-y-4">
              <select value={newReview.member} onChange={e => setNewReview(prev => ({ ...prev, member: e.target.value }))} className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 outline-none bg-white">
                <option value="">Sélectionner un membre</option>
                {members.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
              </select>

              <input type="text" placeholder="Temps de lecture (ex: 2 semaines)" value={newReview.readingTime} onChange={e => setNewReview(prev => ({ ...prev, readingTime: e.target.value }))} className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 outline-none" />

              <div className="space-y-3">
                <div className="bg-blue-50 p-4 rounded-xl">
                  <p className="text-sm font-semibold mb-2">✍️ Écriture & style</p>
                  <StarRating rating={newReview.writing} onRate={r => setNewReview(prev => ({ ...prev, writing: r }))} />
                </div>

                <div className="bg-purple-50 p-4 rounded-xl">
                  <p className="text-sm font-semibold mb-2">📖 Intrigue & structure</p>
                  <StarRating rating={newReview.plot} onRate={r => setNewReview(prev => ({ ...prev, plot: r }))} />
                </div>

                <div className="bg-pink-50 p-4 rounded-xl">
                  <p className="text-sm font-semibold mb-2">👥 Personnages</p>
                  <StarRating rating={newReview.characters} onRate={r => setNewReview(prev => ({ ...prev, characters: r }))} />
                </div>

                <div className="bg-yellow-50 p-4 rounded-xl">
                  <p className="text-sm font-semibold mb-2">💫 Impact & plaisir</p>
                  <StarRating rating={newReview.impact} onRate={r => setNewReview(prev => ({ ...prev, impact: r }))} />
                </div>

                {(newReview.writing || newReview.plot || newReview.characters || newReview.impact) > 0 && (
                  <div className="bg-gradient-to-r from-pink-100 to-purple-100 p-4 rounded-xl text-center">
                    <p className="text-sm text-gray-600 mb-1">Note finale</p>
                    <div className="flex items-center justify-center gap-2">
                      <Star size={24} className="fill-pink-500 text-pink-500" />
                      <p className="text-3xl font-bold text-pink-600">
                        {(((newReview.writing || 0) + (newReview.plot || 0) + (newReview.characters || 0) + (newReview.impact || 0)) / 4).toFixed(1)}/10
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <textarea placeholder="Commentaire (optionnel)" value={newReview.comment} onChange={e => setNewReview(prev => ({ ...prev, comment: e.target.value }))} className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 outline-none h-24 resize-none" />
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={addReview} className="flex-1 bg-pink-500 text-white px-6 py-3 rounded-xl font-semibold">Publier</button>
              <button onClick={() => setShowAddReview(false)} className="flex-1 bg-gray-200 px-6 py-3 rounded-xl font-semibold">Annuler</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Quote */}
      {showAddQuote && selectedBook && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-6">Ajouter une citation</h2>
            <div className="space-y-4">
              <select value={newQuote.member} onChange={e => setNewQuote(prev => ({ ...prev, member: e.target.value }))} className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 outline-none bg-white">
                <option value="">Sélectionner un membre</option>
                {members.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
              </select>

              <textarea placeholder="Extrait ou citation..." value={newQuote.text} onChange={e => setNewQuote(prev => ({ ...prev, text: e.target.value }))} className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 outline-none h-32 resize-none" />
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={addQuote} className="flex-1 bg-purple-500 text-white px-6 py-3 rounded-xl font-semibold">Publier</button>
              <button onClick={() => setShowAddQuote(false)} className="flex-1 bg-gray-200 px-6 py-3 rounded-xl font-semibold">Annuler</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Member */}
      {showAddMember && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-6">Nouveau membre</h2>
            <input type="text" placeholder="Prénom" value={newMemberName} onChange={e => setNewMemberName(e.target.value)} className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 outline-none" />
            <div className="flex gap-3 mt-6">
              <button onClick={() => { if (!newMemberName.trim()) { alert('Nom requis'); return; } addMember(); }} className="flex-1 bg-blue-500 text-white px-6 py-3 rounded-xl font-semibold">Ajouter</button>
              <button onClick={() => setShowAddMember(false)} className="flex-1 bg-gray-200 px-6 py-3 rounded-xl font-semibold">Annuler</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
